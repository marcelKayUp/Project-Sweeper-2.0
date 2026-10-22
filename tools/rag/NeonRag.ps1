# NEON CONTRACT – Tag-RAG
# Baut und durchsucht den Abschnittsindex unter rag/.
# Maßgeblich bleiben die Quelldokumente. Der Index ist ein Abruf.

<#
.SYNOPSIS
  Durchsucht die Planungsabschnitte von NEON CONTRACT nach Kennungen.

.DESCRIPTION
  Kennungen sind MOD-01 bis MOD-15, S01 bis S23, GEN-00 bis GEN-12,
  Teilkennungen wie GEN-02A, AP-01 bis AP-36, Meilensteine M0 bis M7
  und Entscheidungen DEC-0001 bis DEC-0014.
  -Build liest die Quelldokumente neu ein und schreibt rag/index.json
  sowie rag/corpus.jsonl.

.EXAMPLE
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03

.EXAMPLE
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag GEN-02A,AP-33

.EXAMPLE
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Build
#>
[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$List,
    [switch]$Json,
    [switch]$Brief,
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [Alias('Tags')]
    [string[]]$Tag,
    [string]$Query,
    [ValidateSet('all', 'primary', 'references')]
    [string]$Scope = 'all',
    [int]$MaxReferences = 15
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$Utf8 = New-Object System.Text.UTF8Encoding $false
try {
    [Console]::OutputEncoding = $Utf8
    $OutputEncoding = $Utf8
} catch {
}

$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$RagDir = Join-Path $Root 'rag'
$IndexPath = Join-Path $RagDir 'index.json'
$CorpusPath = Join-Path $RagDir 'corpus.jsonl'

$SectionFiles = @(
    @{ Path = 'docs/MODULE.md'; Role = 'plan' },
    @{ Path = 'docs/MVP_MODULE.md'; Role = 'mvp' },
    @{ Path = 'docs/SCREENS.md'; Role = 'plan' },
    @{ Path = 'docs/MVP_SCREENS.md'; Role = 'mvp' },
    @{ Path = 'docs/GENERATOREN.md'; Role = 'plan' },
    @{ Path = 'docs/MVP_GENERATOREN.md'; Role = 'mvp' },
    @{ Path = 'docs/ARBEITSPAKETE.md'; Role = 'plan' },
    @{ Path = 'docs/ENTWICKLUNGSPLAN.md'; Role = 'plan' }
)

function New-StringList {
    return ,(New-Object 'System.Collections.Generic.List[string]')
}

function Show-Usage {
    Write-Output @"
NEON CONTRACT Tag-RAG

Suchen:
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag GEN-02A,AP-33
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag S01-S04
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Query Deckung
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -List
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03 -Json

Neu aufbauen und füllen:
  powershell -NoProfile -File tools/rag/NeonRag.ps1 -Build

Der Index steht in rag/. Bei Abweichungen gilt das Quelldokument.
"@
}

function Get-Sha256 {
    param([string]$Path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $hash = $sha.ComputeHash($stream)
    } finally {
        $stream.Dispose()
        $sha.Dispose()
    }
    return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Read-Lines {
    param([string]$Path)
    $text = [System.IO.File]::ReadAllText($Path, $Utf8)
    $parts = [regex]::Split($text, '\r?\n')
    $lines = New-Object 'System.Collections.Generic.List[string]'
    foreach ($part in @($parts)) {
        [void]$lines.Add([string]$part)
    }
    return ,$lines
}

function Get-TagKind {
    param([string]$Value)
    if ($Value -match '^DEC-') { return 'DEC' }
    if ($Value -match '^MOD-') { return 'MOD' }
    if ($Value -match '^GEN-') { return 'GEN' }
    if ($Value -match '^AP-') { return 'AP' }
    if ($Value -match '^S\d') { return 'S' }
    if ($Value -match '^M\d$') { return 'M' }
    return 'other'
}

function Format-NumberedTag {
    param(
        [string]$Kind,
        [int]$Number,
        [string]$Suffix
    )
    $Kind = $Kind.ToUpper()
    if (-not $Suffix) { $Suffix = '' } else { $Suffix = $Suffix.ToUpper() }
    if ($Kind -eq 'M') {
        if ($Number -lt 0 -or $Number -gt 7) { return $null }
        return ('M{0}' -f $Number)
    }
    if ($Kind -eq 'S') {
        if ($Number -lt 1 -or $Number -gt 99) { return $null }
        return ('S{0:D2}{1}' -f $Number, $Suffix)
    }
    if ($Kind -eq 'DEC') {
        if ($Number -lt 0 -or $Number -gt 9999) { return $null }
        return ('DEC-{0:D4}' -f $Number)
    }
    if ($Kind -eq 'MOD' -or $Kind -eq 'GEN' -or $Kind -eq 'AP') {
        if ($Number -lt 0 -or $Number -gt 99) { return $null }
        return ('{0}-{1:D2}{2}' -f $Kind, $Number, $Suffix)
    }
    return $null
}

function ConvertTo-CanonicalTag {
    param([string]$Raw)
    $value = $Raw.Trim()
    if (-not $value) { return $null }
    if ($value -match '^(?i)(?:DEC|ADR|Entscheidung)[-\s]?(0\d{3})$') {
        return (Format-NumberedTag 'DEC' ([int]$Matches[1]) '')
    }
    if ($value -match '^(0\d{3})$') {
        return (Format-NumberedTag 'DEC' ([int]$Matches[1]) '')
    }
    if ($value -match '^(?i)M([0-7])$') {
        return (Format-NumberedTag 'M' ([int]$Matches[1]) '')
    }
    if ($value -match '^(?i)S-?(\d{1,2})([A-Z])?$') {
        $suffix = ''
        if ($Matches[2]) { $suffix = $Matches[2] }
        return (Format-NumberedTag 'S' ([int]$Matches[1]) $suffix)
    }
    if ($value -match '^(?i)(MOD|GEN|AP)-?(\d{1,2})([A-Z])?$') {
        $suffix = ''
        if ($Matches[3]) { $suffix = $Matches[3] }
        return (Format-NumberedTag $Matches[1] ([int]$Matches[2]) $suffix)
    }
    return $null
}

function Add-UniqueTag {
    param(
        $List,
        $Seen,
        [string]$Value
    )
    if (-not $Value) { return }
    if ($Seen.Add($Value)) {
        [void]$List.Add($Value)
    }
}

function Test-RangeSeparator {
    param([string]$Separator)
    if (-not $Separator) { return $false }
    $code = [int][char]$Separator[0]
    return ($code -eq 0x2D -or $code -eq 0x2012 -or $code -eq 0x2013 -or $code -eq 0x2014 -or $code -eq 0x2212)
}

function Get-DocTags {
    param([string]$Text)
    $tags = New-StringList
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    $options = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    $moduleRx = New-Object System.Text.RegularExpressions.Regex '(?<![A-Za-z])(MOD|GEN|AP)-(\d{1,2})([A-Z])?((?:/\d{1,2}[A-Z]?)*)', $options
    foreach ($match in $moduleRx.Matches($Text)) {
        $suffix = ''
        if ($match.Groups[3].Success) { $suffix = $match.Groups[3].Value }
        $id = Format-NumberedTag $match.Groups[1].Value ([int]$match.Groups[2].Value) $suffix
        Add-UniqueTag $tags $seen $id
        if ($suffix) {
            Add-UniqueTag $tags $seen (Format-NumberedTag $match.Groups[1].Value ([int]$match.Groups[2].Value) '')
        }
        foreach ($piece in [regex]::Matches($match.Groups[4].Value, '(\d{1,2})([A-Z])?')) {
            $pieceSuffix = ''
            if ($piece.Groups[2].Success) { $pieceSuffix = $piece.Groups[2].Value }
            Add-UniqueTag $tags $seen (Format-NumberedTag $match.Groups[1].Value ([int]$piece.Groups[1].Value) $pieceSuffix)
        }
    }

    $screenRx = New-Object System.Text.RegularExpressions.Regex '(?<![A-Za-z0-9])(S|M)-?(\d{1,2})((?:\s*(?:/|\u2012|\u2013|\u2014|\u2212|-|\u2192)\s*(?:S|M)?-?\d{1,2})*)', $options
    $pieceRx = New-Object System.Text.RegularExpressions.Regex '(?<sep>/|\u2012|\u2013|\u2014|\u2212|-|\u2192)\s*(?:S|M)?-?(?<n>\d{1,2})', $options
    foreach ($match in $screenRx.Matches($Text)) {
        $kind = $match.Groups[1].Value.ToUpper()
        $numbers = New-Object 'System.Collections.Generic.List[int]'
        [void]$numbers.Add([int]$match.Groups[2].Value)
        foreach ($piece in $pieceRx.Matches($match.Groups[3].Value)) {
            $number = [int]$piece.Groups['n'].Value
            $separator = $piece.Groups['sep'].Value
            if (Test-RangeSeparator $separator) {
                $from = $numbers[$numbers.Count - 1]
                $low = [Math]::Min($from, $number)
                $high = [Math]::Max($from, $number)
                if (($high - $low) -le 40) {
                    for ($i = $low; $i -le $high; $i++) {
                        [void]$numbers.Add($i)
                    }
                } else {
                    [void]$numbers.Add($number)
                }
            } else {
                [void]$numbers.Add($number)
            }
        }
        foreach ($number in $numbers) {
            Add-UniqueTag $tags $seen (Format-NumberedTag $kind $number '')
        }
    }

    $decisionRx = New-Object System.Text.RegularExpressions.Regex '(?:decisions/|\]\()(0\d{3})-|Entscheidung\s+(0\d{3})', $options
    foreach ($match in $decisionRx.Matches($Text)) {
        $id = $match.Groups[1].Value
        if (-not $id) { $id = $match.Groups[2].Value }
        Add-UniqueTag $tags $seen (Format-NumberedTag 'DEC' ([int]$id) '')
    }
    return ,$tags
}

function Get-HeadingTag {
    param([string]$Plain)
    $options = [System.Text.RegularExpressions.RegexOptions]::None
    $rx = New-Object System.Text.RegularExpressions.Regex '^(?:\d+\.\s+)?((?:MOD|GEN|AP)-\d{2}|S\d{2}|M[0-7])\s*\u00B7\s*(.+)$', $options
    $match = $rx.Match($Plain)
    if (-not $match.Success) { return $null }
    return [pscustomobject]@{
        Tag = $match.Groups[1].Value.ToUpper()
        Title = $match.Groups[2].Value.Trim()
    }
}

function Get-Subtags {
    param(
        $Lines,
        [int]$Start,
        [int]$End
    )
    $result = New-Object System.Collections.Generic.List[object]
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    $options = [System.Text.RegularExpressions.RegexOptions]::None
    $rx = New-Object System.Text.RegularExpressions.Regex '\*\*((?:MOD|GEN|AP)-\d{2}[A-Z])\s+(?:\u2013\s*|\u2014\s*|-\s*)?([^*\r\n]+?)\s*\*\*', $options
    for ($i = $Start; $i -lt $End; $i++) {
        $match = $rx.Match($Lines[$i])
        if (-not $match.Success) { continue }
        $raw = $match.Groups[1].Value.ToUpper()
        if ($raw -notmatch '^(MOD|GEN|AP)-(\d{2})([A-Z])$') { continue }
        $tag = '{0}-{1}{2}' -f $Matches[1], $Matches[2], $Matches[3]
        if (-not $seen.Add($tag)) { continue }
        $title = $match.Groups[2].Value.Trim().TrimEnd(':').Trim()
        [void]$result.Add([ordered]@{
            tag = $tag
            title = $title
            line = ($i + 1)
            text = $Lines[$i].Trim()
        })
    }
    return ,$result
}

function Join-Section {
    param(
        $Lines,
        [int]$Start,
        [int]$End
    )
    $last = $End - 1
    while ($last -gt $Start -and [string]::IsNullOrWhiteSpace($Lines[$last])) {
        $last--
    }
    $builder = New-Object System.Text.StringBuilder
    for ($i = $Start; $i -le $last; $i++) {
        if ($i -gt $Start) { [void]$builder.Append("`n") }
        [void]$builder.Append($Lines[$i])
    }
    return [pscustomobject]@{
        Text = $builder.ToString()
        EndLine = ($last + 1)
    }
}

function Get-TaggedSections {
    param(
        [string]$RelativePath,
        [string]$Role
    )
    $full = Join-Path $Root ($RelativePath -replace '/', '\')
    if (-not (Test-Path -LiteralPath $full)) {
        throw "Quelldatei fehlt: $RelativePath"
    }
    $lines = Read-Lines $full
    $headings = New-Object System.Collections.Generic.List[object]
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^(#{1,6})\s+(.+?)\s*$') {
            $plain = $Matches[2]
            [void]$headings.Add([pscustomobject]@{
                Index = $i
                Level = $Matches[1].Length
                Plain = $plain
                Tag = (Get-HeadingTag $plain)
            })
        }
    }

    $chunks = New-Object System.Collections.Generic.List[object]
    for ($h = 0; $h -lt $headings.Count; $h++) {
        $heading = $headings[$h]
        if ($null -eq $heading.Tag) { continue }
        $end = $lines.Count
        for ($j = $h + 1; $j -lt $headings.Count; $j++) {
            if ($headings[$j].Level -le $heading.Level) {
                $end = $headings[$j].Index
                break
            }
        }
        $group = ''
        for ($g = $h - 1; $g -ge 0; $g--) {
            if ($headings[$g].Level -lt $heading.Level) {
                $group = [string]$headings[$g].Plain
                break
            }
        }
        $section = Join-Section $lines $heading.Index $end
        $subtags = Get-Subtags $lines $heading.Index $end
        $links = Get-DocTags $section.Text
        $own = New-Object 'System.Collections.Generic.HashSet[string]'
        [void]$own.Add([string]$heading.Tag.Tag)
        foreach ($sub in $subtags) {
            [void]$own.Add([string]$sub.tag)
        }
        $kept = New-StringList
        foreach ($link in $links) {
            if (-not $own.Contains($link)) {
                [void]$kept.Add($link)
            }
        }
        [void]$chunks.Add([ordered]@{
            id = ('{0}#{1}' -f $RelativePath, $heading.Tag.Tag)
            tag = [string]$heading.Tag.Tag
            kind = (Get-TagKind $heading.Tag.Tag)
            role = $Role
            title = [string]$heading.Tag.Title
            source = $RelativePath
            startLine = ($heading.Index + 1)
            endLine = $section.EndLine
            group = $group
            subtags = @($subtags.ToArray())
            links = @($kept.ToArray())
            text = $section.Text
        })
    }
    return ,$chunks
}

function Get-DecisionChunk {
    param([string]$RelativePath)
    $name = [System.IO.Path]::GetFileName($RelativePath)
    if ($name -notmatch '^(0\d{3})-') {
        throw "Entscheidungsdatei ohne Nummer: $RelativePath"
    }
    $tag = Format-NumberedTag 'DEC' ([int]$Matches[1]) ''
    $full = Join-Path $Root ($RelativePath -replace '/', '\')
    $lines = Read-Lines $full
    $title = $tag
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^#\s+(.+?)\s*$') {
            $title = $Matches[1] -replace '^\d{4}\s*(?:\u00B7|\u2013|\u2014|-)\s*', ''
            break
        }
    }
    $section = Join-Section $lines 0 $lines.Count
    $links = Get-DocTags $section.Text
    $kept = New-StringList
    foreach ($link in $links) {
        if ($link -ne $tag) { [void]$kept.Add($link) }
    }
    return [ordered]@{
        id = ('{0}#{1}' -f $RelativePath, $tag)
        tag = $tag
        kind = 'DEC'
        role = 'decision'
        title = $title.Trim()
        source = $RelativePath
        startLine = 1
        endLine = $section.EndLine
        group = ''
        subtags = @()
        links = @($kept.ToArray())
        text = $section.Text
    }
}

function Add-IndexTag {
    param(
        $Map,
        [string]$Tag,
        [string]$Title,
        [string]$Parent
    )
    if (-not $Map.Contains($Tag)) {
        $Map[$Tag] = [ordered]@{
            kind = (Get-TagKind $Tag)
            title = $Title
            parent = $Parent
            primary = (New-StringList)
            references = (New-StringList)
        }
        return
    }
    if ($Title -and -not $Map[$Tag].title) {
        $Map[$Tag].title = $Title
    }
    if ($Parent -and -not $Map[$Tag].parent) {
        $Map[$Tag].parent = $Parent
    }
}

function Build-Rag {
    $chunks = New-Object System.Collections.Generic.List[object]
    $sources = New-Object System.Collections.Generic.List[object]
    $problems = New-StringList

    foreach ($file in $SectionFiles) {
        $full = Join-Path $Root ($file.Path -replace '/', '\')
        foreach ($chunk in (Get-TaggedSections $file.Path $file.Role)) {
            [void]$chunks.Add($chunk)
        }
        [void]$sources.Add([ordered]@{
            path = $file.Path
            sha256 = (Get-Sha256 $full)
        })
    }

    $decisionDir = Join-Path $Root 'docs\decisions'
    $decisionFiles = @(Get-ChildItem -LiteralPath $decisionDir -Filter '*.md' | Sort-Object Name)
    if ($decisionFiles.Count -eq 0) {
        [void]$problems.Add('Keine Entscheidungsdateien gefunden.')
    }
    foreach ($file in $decisionFiles) {
        $relative = 'docs/decisions/' + $file.Name
        [void]$chunks.Add((Get-DecisionChunk $relative))
        [void]$sources.Add([ordered]@{
            path = $relative
            sha256 = (Get-Sha256 $file.FullName)
        })
    }

    $ids = New-Object 'System.Collections.Generic.HashSet[string]'
    $byId = @{}
    foreach ($chunk in $chunks) {
        if (-not $ids.Add([string]$chunk.id)) {
            [void]$problems.Add(('Doppelte Abschnitts-ID: {0}' -f $chunk.id))
        }
        $byId[$chunk.id] = $chunk
        if ([string]::IsNullOrWhiteSpace([string]$chunk.text)) {
            [void]$problems.Add(('Leerer Abschnitt: {0}' -f $chunk.id))
        }
        if ([int]$chunk.endLine -lt [int]$chunk.startLine) {
            [void]$problems.Add(('Zeilenbereich ungueltig: {0}' -f $chunk.id))
        }
        if ($chunk.kind -eq 'DEC') {
            $number = ([string]$chunk.tag).Substring(4)
            if (([string]$chunk.text) -notmatch [regex]::Escape($number)) {
                [void]$problems.Add(('Entscheidung ohne Nummer im Text: {0}' -f $chunk.id))
            }
            if (([string]$chunk.title) -match '^\d{4}\b') {
                [void]$problems.Add(('Entscheidungstitel behaelt die Nummer: {0} / {1}' -f $chunk.id, $chunk.title))
            }
        } elseif (([string]$chunk.text) -notmatch [regex]::Escape([string]$chunk.tag)) {
            [void]$problems.Add(('Abschnitt enthaelt die eigene Kennung nicht: {0}' -f $chunk.id))
        }
    }

    $tagMap = @{}
    foreach ($chunk in $chunks) {
        Add-IndexTag $tagMap ([string]$chunk.tag) ([string]$chunk.title) ''
        [void]$tagMap[$chunk.tag].primary.Add([string]$chunk.id)
        foreach ($sub in @($chunk.subtags)) {
            $parent = ''
            if ([string]$sub.tag -match '^(MOD|GEN|AP)-(\d{2})[A-Z]$') {
                $parent = '{0}-{1}' -f $Matches[1], $Matches[2]
            }
            Add-IndexTag $tagMap ([string]$sub.tag) ([string]$sub.title) $parent
            if (-not $tagMap[$sub.tag].primary.Contains([string]$chunk.id)) {
                [void]$tagMap[$sub.tag].primary.Add([string]$chunk.id)
            }
        }
        foreach ($link in @($chunk.links)) {
            Add-IndexTag $tagMap ([string]$link) '' ''
            $entry = $tagMap[$link]
            if ($entry.primary.Contains([string]$chunk.id)) { continue }
            if (-not $entry.references.Contains([string]$chunk.id)) {
                [void]$entry.references.Add([string]$chunk.id)
            }
        }
    }

    function Assert-Roles {
        param(
            [string]$Tag,
            [string[]]$Roles
        )
        if (-not $tagMap.Contains($Tag)) {
            [void]$problems.Add("Fehlende Kennung $Tag")
            return
        }
        $have = New-StringList
        foreach ($id in @($tagMap[$Tag].primary)) {
            [void]$have.Add([string]$byId[$id].role)
        }
        if ($have.Count -ne $Roles.Count) {
            [void]$problems.Add(('{0}: erwartet {1} Primaereintraege, gefunden {2}' -f $Tag, $Roles.Count, $have.Count))
        }
        foreach ($role in $Roles) {
            if ($have -notcontains $role) {
                [void]$problems.Add(('{0}: Rolle {1} fehlt' -f $Tag, $role))
            }
        }
    }

    foreach ($number in 1..15) {
        Assert-Roles (Format-NumberedTag 'MOD' $number '') @('plan', 'mvp')
    }
    foreach ($number in 1..23) {
        Assert-Roles (Format-NumberedTag 'S' $number '') @('plan', 'mvp')
    }
    foreach ($number in 0..12) {
        Assert-Roles (Format-NumberedTag 'GEN' $number '') @('plan', 'mvp')
    }
    foreach ($number in 1..36) {
        Assert-Roles (Format-NumberedTag 'AP' $number '') @('plan')
    }
    foreach ($number in 0..7) {
        Assert-Roles (Format-NumberedTag 'M' $number '') @('plan')
    }
    foreach ($file in $decisionFiles) {
        $decTag = Format-NumberedTag 'DEC' ([int]$file.Name.Substring(0, 4)) ''
        Assert-Roles $decTag @('decision')
    }
    foreach ($letter in @('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H')) {
        Assert-Roles ('GEN-02' + $letter) @('plan', 'mvp')
        Assert-Roles ('GEN-05' + $letter) @('plan', 'mvp')
    }

    $ap13 = $byId['docs/ARBEITSPAKETE.md#AP-13']
    foreach ($need in @('AP-11', 'AP-12', 'S01', 'S02', 'S03', 'S04', 'S07', 'S08', 'S21', 'S22')) {
        if (@($ap13.links) -notcontains $need) {
            [void]$problems.Add("AP-13 verweist nicht auf $need")
        }
    }
    $ap01 = $byId['docs/ARBEITSPAKETE.md#AP-01']
    foreach ($need in @('M0', 'MOD-01', 'MOD-07', 'MOD-09', 'DEC-0007', 'DEC-0013')) {
        if (@($ap01.links) -notcontains $need) {
            [void]$problems.Add("AP-01 verweist nicht auf $need")
        }
    }

    if ($problems.Count -gt 0) {
        foreach ($problem in $problems) {
            [Console]::Error.WriteLine($problem)
        }
        exit 1
    }

    if (-not (Test-Path -LiteralPath $RagDir)) {
        New-Item -ItemType Directory -Path $RagDir | Out-Null
    }

    $corpusBuilder = New-Object System.Text.StringBuilder
    foreach ($chunk in $chunks) {
        $line = ConvertTo-Json -InputObject $chunk -Depth 8 -Compress
        [void]$corpusBuilder.Append($line)
        [void]$corpusBuilder.Append("`n")
    }
    [System.IO.File]::WriteAllText($CorpusPath, $corpusBuilder.ToString(), $Utf8)

    $tagsOut = [ordered]@{}
    foreach ($name in (@($tagMap.Keys) | Sort-Object)) {
        $entry = $tagMap[$name]
        $tagsOut[$name] = [ordered]@{
            kind = $entry.kind
            title = $entry.title
            parent = $entry.parent
            primary = @($entry.primary.ToArray())
            references = @($entry.references.ToArray() | Sort-Object)
        }
    }
    $subCount = 0
    foreach ($name in $tagsOut.Keys) {
        if ($tagsOut[$name].parent) { $subCount++ }
    }
    $index = [ordered]@{
        schema = 1
        builtAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
        usage = 'powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03'
        rebuild = 'powershell -NoProfile -File tools/rag/NeonRag.ps1 -Build'
        note = 'Abruf der gekennzeichneten Planungsabschnitte. Bei Abweichungen gilt das Quelldokument.'
        counts = [ordered]@{
            chunks = $chunks.Count
            tags = $tagsOut.Count
            subtags = $subCount
        }
        sources = @($sources.ToArray())
        tags = $tagsOut
    }
    $indexJson = ConvertTo-Json -InputObject $index -Depth 8
    [System.IO.File]::WriteAllText($IndexPath, $indexJson + "`n", $Utf8)

    $roundtrip = [System.IO.File]::ReadAllText($CorpusPath, $Utf8)
    $first = ($roundtrip -split '\n' | Where-Object { $_ -match '"tag":"MOD-01"' } | Select-Object -First 1)
    if (-not $first) {
        [Console]::Error.WriteLine('Ruecklesen fehlgeschlagen: MOD-01 fehlt im Korpus.')
        exit 1
    }
    $parsed = $first | ConvertFrom-Json
    $expectedTitle = 'Content-Vertr' + [char]0x00E4 + 'ge und Versionsverwaltung'
    if ($parsed.title -ne $expectedTitle) {
        [Console]::Error.WriteLine('Ruecklesen fehlgeschlagen: Umlaut im Titel von MOD-01.')
        exit 1
    }

    Write-Output ('RAG geschrieben: {0} Abschnitte, {1} Kennungen, davon {2} Teilkennungen.' -f $chunks.Count, $tagsOut.Count, $subCount)
    Write-Output ('Dateien: {0}' -f $IndexPath)
    Write-Output ('         {0}' -f $CorpusPath)
}

function ConvertTo-ObjectArray {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [System.Array]) { return @($Value) }
    return @($Value)
}

function Read-Corpus {
    $chunks = New-Object System.Collections.Generic.List[object]
    $reader = New-Object System.IO.StreamReader($CorpusPath, $Utf8, $true)
    try {
        while ($null -ne ($line = $reader.ReadLine())) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            [void]$chunks.Add(($line | ConvertFrom-Json))
        }
    } finally {
        $reader.Dispose()
    }
    return ,$chunks
}

function Get-StaleSources {
    param($Index)
    $stale = New-StringList
    foreach ($source in (ConvertTo-ObjectArray $Index.sources)) {
        $full = Join-Path $Root ([string]$source.path -replace '/', '\')
        if (-not (Test-Path -LiteralPath $full)) {
            [void]$stale.Add([string]$source.path)
            continue
        }
        if ((Get-Sha256 $full) -ne [string]$source.sha256) {
            [void]$stale.Add([string]$source.path)
        }
    }
    return ,$stale
}

function Expand-QueryTokens {
    param([string[]]$Tokens)
    $tags = New-StringList
    $words = New-StringList
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($token in @($Tokens)) {
        if ([string]::IsNullOrWhiteSpace($token)) { continue }
        foreach ($part in ([regex]::Split($token, '[,;]'))) {
            $part = $part.Trim()
            if (-not $part) { continue }
            $expanded = New-StringList
            if ($part -match '^(?i)(MOD|GEN|AP)-(\d{1,2})((?:/\d{1,2})+)$') {
                [void]$expanded.Add((Format-NumberedTag $Matches[1] ([int]$Matches[2]) ''))
                foreach ($piece in [regex]::Matches($Matches[3], '\d{1,2}')) {
                    [void]$expanded.Add((Format-NumberedTag $Matches[1] ([int]$piece.Value) ''))
                }
            } elseif ($part -match '^(?i)(S|M)-?(\d{1,2})\s*(?:\u2012|\u2013|\u2014|\u2212|-)\s*(?:S|M)?-?(\d{1,2})$') {
                $kind = $Matches[1].ToUpper()
                $low = [Math]::Min([int]$Matches[2], [int]$Matches[3])
                $high = [Math]::Max([int]$Matches[2], [int]$Matches[3])
                if (($high - $low) -le 40) {
                    for ($i = $low; $i -le $high; $i++) {
                        $formatted = Format-NumberedTag $kind $i ''
                        if ($formatted) { [void]$expanded.Add($formatted) }
                    }
                }
            } elseif ($part -match '^(?i)S-?\d{1,2}(?:/S?-?\d{1,2})+$') {
                foreach ($piece in [regex]::Matches($part, '\d{1,2}')) {
                    $formatted = Format-NumberedTag 'S' ([int]$piece.Value) ''
                    if ($formatted) { [void]$expanded.Add($formatted) }
                }
            } else {
                $one = ConvertTo-CanonicalTag $part
                if ($one) { [void]$expanded.Add($one) }
            }
            if ($expanded.Count -eq 0) {
                [void]$words.Add($part)
            } else {
                foreach ($item in $expanded) {
                    Add-UniqueTag $tags $seen $item
                }
            }
        }
    }
    return [pscustomobject]@{
        Tags = $tags
        Words = $words
    }
}

function Fold-SearchText {
    param([string]$Value)
    if (-not $Value) { return '' }
    return $Value.ToLowerInvariant().Replace(([string][char]0x00DF), 'ss')
}

function Test-WordMatch {
    param(
        $Chunk,
        $Words
    )
    if ($Words.Count -eq 0) { return $true }
    $builder = New-Object System.Text.StringBuilder
    [void]$builder.Append([string]$Chunk.title)
    [void]$builder.Append("`n")
    [void]$builder.Append([string]$Chunk.text)
    foreach ($sub in (ConvertTo-ObjectArray $Chunk.subtags)) {
        [void]$builder.Append("`n")
        [void]$builder.Append([string]$sub.title)
        [void]$builder.Append("`n")
        [void]$builder.Append([string]$sub.text)
    }
    $hay = Fold-SearchText $builder.ToString()
    foreach ($word in $Words) {
        if ($hay.IndexOf((Fold-SearchText $word)) -lt 0) { return $false }
    }
    return $true
}

function Search-Rag {
    if (-not (Test-Path -LiteralPath $IndexPath) -or -not (Test-Path -LiteralPath $CorpusPath)) {
        [Console]::Error.WriteLine('Der RAG-Index fehlt. Zuerst ausfuehren: powershell -NoProfile -File tools/rag/NeonRag.ps1 -Build')
        exit 2
    }
    $index = [System.IO.File]::ReadAllText($IndexPath, $Utf8) | ConvertFrom-Json
    $stale = Get-StaleSources $index
    if ($stale.Count -gt 0) {
        [Console]::Error.WriteLine(('Hinweis: Quelldateien haben sich seit dem Aufbau geändert: {0}' -f ($stale -join ', ')))
        [Console]::Error.WriteLine('Neu aufbauen: powershell -NoProfile -File tools/rag/NeonRag.ps1 -Build')
    }

    if ($List) {
        $rows = New-Object System.Collections.Generic.List[object]
        foreach ($property in @($index.tags.PSObject.Properties | Sort-Object Name)) {
            $value = $property.Value
            [void]$rows.Add([ordered]@{
                tag = $property.Name
                kind = $value.kind
                title = $value.title
                parent = $value.parent
                primary = @((ConvertTo-ObjectArray $value.primary).Count)
                references = @((ConvertTo-ObjectArray $value.references).Count)
            })
        }
        if ($Json) {
            Write-Output (ConvertTo-Json -InputObject @($rows.ToArray()) -Depth 5)
        } else {
            Write-Output ('{0} Kennungen, {1} Abschnitte' -f $rows.Count, $index.counts.chunks)
            foreach ($row in $rows) {
                $parent = ''
                if ($row.parent) { $parent = ' teil-von ' + $row.parent }
                Write-Output ('{0}  {1}  primär {2}  verweise {3}{4}' -f $row.tag, $row.title, $row.primary, $row.references, $parent)
            }
        }
        exit 0
    }

    $tokens = @()
    if ($Tag) { $tokens += @($Tag) }
    if ($Query) { $tokens += @($Query) }
    $expanded = Expand-QueryTokens $tokens
    if ($expanded.Tags.Count -eq 0 -and $expanded.Words.Count -eq 0) {
        Show-Usage
        exit 1
    }

    $known = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($property in @($index.tags.PSObject.Properties)) {
        [void]$known.Add($property.Name)
    }
    $missing = New-StringList
    foreach ($name in $expanded.Tags) {
        if (-not $known.Contains($name)) { [void]$missing.Add($name) }
    }

    $wanted = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($name in $expanded.Tags) { [void]$wanted.Add($name) }
    $chunks = Read-Corpus
    $roleRank = @{ plan = 0; mvp = 1; decision = 2 }
    $hits = New-Object System.Collections.Generic.List[object]
    foreach ($chunk in $chunks) {
        if (-not (Test-WordMatch $chunk $expanded.Words)) { continue }
        $matchedPrimary = New-StringList
        $matchedReference = New-StringList
        if ($wanted.Contains([string]$chunk.tag)) {
            [void]$matchedPrimary.Add([string]$chunk.tag)
        }
        $focus = New-Object System.Collections.Generic.List[object]
        foreach ($sub in (ConvertTo-ObjectArray $chunk.subtags)) {
            if ($wanted.Contains([string]$sub.tag)) {
                [void]$matchedPrimary.Add([string]$sub.tag)
                [void]$focus.Add($sub)
            }
        }
        foreach ($link in (ConvertTo-ObjectArray $chunk.links)) {
            if ($wanted.Contains([string]$link)) {
                [void]$matchedReference.Add([string]$link)
            }
        }
        $isPrimary = $matchedPrimary.Count -gt 0
        $isReference = (-not $isPrimary) -and $matchedReference.Count -gt 0
        $isText = ($wanted.Count -eq 0)
        if ($Scope -eq 'primary' -and -not $isPrimary -and -not $isText) { continue }
        if ($Scope -eq 'references' -and -not $isReference) { continue }
        if (-not $isPrimary -and -not $isReference -and -not $isText) { continue }
        $match = 'text'
        if ($isPrimary) { $match = 'primary' }
        elseif ($isReference) { $match = 'reference' }
        $rank = 9
        if ($roleRank.ContainsKey([string]$chunk.role)) { $rank = $roleRank[[string]$chunk.role] }
        [void]$hits.Add([pscustomobject]@{
            match = $match
            matchedTags = @(@($matchedPrimary.ToArray()) + @($matchedReference.ToArray()))
            focus = @($focus.ToArray())
            score = (($matchedPrimary.Count * 10) + $matchedReference.Count)
            roleRank = $rank
            id = [string]$chunk.id
            tag = [string]$chunk.tag
            kind = [string]$chunk.kind
            role = [string]$chunk.role
            title = [string]$chunk.title
            source = [string]$chunk.source
            startLine = [int]$chunk.startLine
            endLine = [int]$chunk.endLine
            group = [string]$chunk.group
            text = [string]$chunk.text
        })
    }

    $primaryHits = New-Object System.Collections.Generic.List[object]
    $referenceHits = New-Object System.Collections.Generic.List[object]
    $textHits = New-Object System.Collections.Generic.List[object]
    foreach ($hit in $hits) {
        if ($hit.match -eq 'primary') { [void]$primaryHits.Add($hit) }
        elseif ($hit.match -eq 'reference') { [void]$referenceHits.Add($hit) }
        else { [void]$textHits.Add($hit) }
    }
    $primarySorted = @($primaryHits.ToArray() | Sort-Object tag, roleRank, source, startLine)
    $referenceSorted = @($referenceHits.ToArray() | Sort-Object @{ Expression = { -$_.score } }, tag, source, startLine)
    $textSorted = @($textHits.ToArray() | Sort-Object tag, roleRank, source, startLine)
    $omitted = 0
    if ($MaxReferences -gt 0 -and $referenceSorted.Count -gt $MaxReferences) {
        $omitted += ($referenceSorted.Count - $MaxReferences)
        $referenceSorted = @($referenceSorted | Select-Object -First $MaxReferences)
    }
    if ($MaxReferences -gt 0 -and $textSorted.Count -gt $MaxReferences) {
        $omitted += ($textSorted.Count - $MaxReferences)
        $textSorted = @($textSorted | Select-Object -First $MaxReferences)
    }
    $shown = New-Object System.Collections.Generic.List[object]
    foreach ($hit in $primarySorted) { [void]$shown.Add($hit) }
    foreach ($hit in $referenceSorted) { [void]$shown.Add($hit) }
    foreach ($hit in $textSorted) { [void]$shown.Add($hit) }

    if ($Json) {
        $payload = [ordered]@{
            query = @($expanded.Tags.ToArray())
            words = @($expanded.Words.ToArray())
            missing = @($missing.ToArray())
            stale = @($stale.ToArray())
            omitted = $omitted
            hits = @($shown.ToArray())
        }
        if ($Brief) {
            $short = New-Object System.Collections.Generic.List[object]
            foreach ($hit in $shown) {
                [void]$short.Add([ordered]@{
                    match = $hit.match
                    matchedTags = $hit.matchedTags
                    id = $hit.id
                    tag = $hit.tag
                    role = $hit.role
                    title = $hit.title
                    source = $hit.source
                    startLine = $hit.startLine
                    endLine = $hit.endLine
                })
            }
            $payload.hits = @($short.ToArray())
        }
        Write-Output (ConvertTo-Json -InputObject $payload -Depth 8)
    } else {
        if ($expanded.Tags.Count -gt 0) {
            Write-Output ('Suche: ' + ($expanded.Tags -join ', '))
        }
        if ($expanded.Words.Count -gt 0) {
            Write-Output ('Wörter: ' + ($expanded.Words -join ', '))
        }
        if ($missing.Count -gt 0) {
            Write-Output ('Unbekannt: ' + ($missing -join ', '))
        }
        Write-Output ('Treffer: {0} primär, {1} Verweise, {2} Text' -f $primarySorted.Count, $(if ($referenceHits.Count -gt $referenceSorted.Count) { $referenceHits.Count } else { $referenceSorted.Count }), $textHits.Count)
        foreach ($hit in $shown) {
            Write-Output ''
            Write-Output ('--- {0} · {1} · {2} · {3}:{4}-{5}' -f $hit.match, $hit.role, $hit.tag, $hit.source, $hit.startLine, $hit.endLine)
            Write-Output ('{0} · {1}' -f $hit.tag, $hit.title)
            if ($hit.matchedTags.Count -gt 0) {
                Write-Output ('Kennungen: ' + ($hit.matchedTags -join ', '))
            }
            foreach ($item in (ConvertTo-ObjectArray $hit.focus)) {
                Write-Output ('Fokus {0} · {1} · Zeile {2}' -f $item.tag, $item.title, $item.line)
                Write-Output ([string]$item.text)
            }
            if (-not $Brief) {
                Write-Output $hit.text
            }
        }
        if ($omitted -gt 0) {
            Write-Output ''
            Write-Output ('Weitere Treffer nicht angezeigt: {0}. -MaxReferences 0 zeigt alle.' -f $omitted)
        }
    }

    if ($shown.Count -eq 0) { exit 1 }
    exit 0
}

if ($MaxReferences -lt 0) {
    [Console]::Error.WriteLine('-MaxReferences muss 0 oder groesser sein.')
    exit 1
}

if ($Build) {
    Build-Rag
    exit 0
}

Search-Rag

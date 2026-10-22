// Checks the authored documents; does not validate or load runtime content.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const report = { passed: false, scope: 'editorial-competition-concept-v8', checks: [], open: ['human conceptual acceptance', 'HTN domain implementation and behavioural validation', 'multilingual and legal-form plausibility', 'runtime catalogue migration'] };
const pass = (name, detail) => report.checks.push({ name, detail });
const hash = value => createHash('sha256').update(value).digest('hex');
try {
 const provenance = JSON.parse(await readFile('docs/sources/cyberpunk_konzerne_v6.provenance.json','utf8'));
 const source = await readFile(provenance.originalPath);
 const copy = await readFile(provenance.projectCopy);
 assert.equal(hash(source),provenance.sha256);
 assert.equal(hash(copy),provenance.sha256);
 assert(source.equals(copy));
 pass('original source unchanged and project copy byte-identical',provenance.sha256);
 const catalog = await readFile('docs/ORGANISATIONSKATALOG.md','utf8');
 const world = await readFile('docs/ORGANISATIONEN.md','utf8');
 const numbers = [...catalog.matchAll(/^### (\d+)\. /gm)].map(m=>Number(m[1]));
 assert.deepEqual(numbers,Array.from({length:70},(_,i)=>i+1));
 const ids = [...catalog.matchAll(/^- \*\*ID:\*\* `([^`]+)`/gm)].map(m=>m[1]);
 assert.equal(ids.length,70); assert.equal(new Set(ids).size,70);
 assert(ids.every(id=>/^[a-z][a-z0-9-]*$/.test(id)));
 const anchors = [...catalog.matchAll(/<a id="([^"]+)"><\/a>/g)].map(m=>m[1]);
 assert.deepEqual(anchors,ids);
 pass('sequential complete catalogue with unique IDs and anchors',{organizations:70,companies:30,independent:40});
 for(const [field,count] of [['Leistung',30],['Domäne',30],['Bevorzugte Mittel',30],['Wiederkehrende Interessen',70],['Machtbasis',70],['Abhängigkeiten',70],['Spannungsachsen',70],['Farbschema',70],['Logo',70]]) {
   assert.equal([...catalog.matchAll(new RegExp(`^- \\*\\*${field}:\\*\\* (.+)$`,'gm'))].length,count,field);
 }
 const colors = [...catalog.matchAll(/^- \*\*Farbschema:\*\* (.+)$/gm)].flatMap(m=>[...m[1].matchAll(/#[0-9a-f]{6}\b/gi)].map(c=>c[0]));
 assert.equal(colors.length,210);
 pass('all reusable actor planning profiles populated',{interests:70,resourceRoles:70,dependencies:70,tensionAxes:70,companyMethodPreferences:30,threeColorPalettes:70,logoBriefings:70});
 const profileBody = catalog.split('## 7. Verwendung und Quellen')[0];
 assert(!/\b(?:Kantor|Glaskante|KASANE|CONCORD|PARALLAX|VERDANT)\b/i.test(profileBody));
 pass('undefined names and rejected companies absent from active profiles',true);
 assert.equal([...world.matchAll(/^### 5\.[1-6] /gm)].length,6);
 for(const anchor of ['methoden','buendnisse']) assert(world.includes(`<a id="${anchor}"></a>`));
 assert(!/contact-|Kette K[1-3]|### K[1-3]|\*\*Lokaler Pilot:/.test(catalog+world));
 assert(!/^- \*\*(?:Geheimnis|Hook|Konflikt|Innerer Konflikt|Dilemma):/m.test(catalog));
 pass('six cooperation structures and reusable methods without fixed cast or plots',{alliances:6,fixedScenarios:0,fixedContacts:0});
 const documents=['docs/ORGANISATIONEN.md','docs/ORGANISATIONSKATALOG.md','docs/decisions/0020-organisationslandschaft-und-lokale-konflikte.md','docs/decisions/0019-bisherige-konzernentwuerfe-verworfen.md'];
 let links=0;
 for(const file of documents) {
   const content=await readFile(file,'utf8');
   for(const m of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
     const url=m[1]; if(/^(?:https?:|mailto:)/.test(url)) continue;
     const [relative,anchor]=url.split('#');
     const target=relative?path.resolve(path.dirname(file),decodeURIComponent(relative)):path.resolve(file);
     const targetContent=await readFile(target,'utf8');
     if(anchor) assert(targetContent.includes(`<a id="${anchor}"></a>`),`Missing explicit anchor ${url} from ${file}`);
     links++;
   }
 }
 pass('local document links and linked explicit anchors resolve',links);
 report.documents=Object.fromEntries(await Promise.all(documents.map(async file=>[file,hash(await readFile(file))])));
 report.passed=true;
} catch(error) {report.error=error.stack??String(error);process.exitCode=1;}
await writeFile('artifacts/concept/organisations-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));

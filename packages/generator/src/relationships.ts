import type { GeneratorConfig, RoomRelationship, RoomRequirement, RoomType } from "./types.ts";

export function planRelationships(config: GeneratorConfig, instances: readonly RoomRequirement[], entryRoomId: string): RoomRelationship[] {
  const relationships: RoomRelationship[] = [];
  const first = (type: RoomType) => instances.find((room) => room.type === type)?.id;
  const connect = (from: string | undefined, to: string | undefined, reason: string, exclusive = false, maxDistance?: number) => {
    if (from && to && from !== to) relationships.push({ from, to, reason, exclusive, ...(maxDistance === undefined ? {} : { maxDistance }) });
  };
  const labs = instances.filter((room) => room.type === "laboratory");
  for (const [index, clean] of instances.filter((room) => room.type === "cleanroom").entries()) {
    const airlock = instances.find((room) => room.id === clean.id.replace("cleanroom", "airlock"));
    connect(clean.id, airlock?.id, "Reinraum ausschließlich über seine eigene Schleuse", true);
    connect(airlock?.id, labs[Math.min(index * 2, labs.length - 1)]?.id, "Schleuse am zugeordneten Labor");
  }
  if (config.corporation === "neutral") return relationships;
  connect(first("executive"), first("assistant") ?? first("corridor"), "Geschäftsführung hinter Assistenz / örtlichem Zugangsverteiler", true);
  connect(first("assistant"), first("restroom"), "Sanitärgruppe am Leitungsbereich: höchstens zwölf Gehfelder ab Assistenz", false, 12);
  connect(first("boardroom"), first("assistant") ?? first("corridor"), "Vorstandssaal im Erschließungsbereich der Geschäftsführung", false, 24);
  connect(first("manager"), first("office"), "Abteilungsleitung unmittelbar beim Team");
  if (config.corporation === "kasane") connect(entryRoomId, first("security"), "KASANE: Sicherheitskontakt am Empfang");
  if (config.corporation === "concord") connect(first("mechanical"), first("corridor"), "CONCORD: Technik am Verkehrsverteiler");
  if (config.corporation === "parallax") connect(entryRoomId, first("meeting") ?? first("breakroom"), "PARALLAX: Besprechung und Begegnung als öffentliche Bühne");
  if (config.corporation === "verdant") connect(first("atrium"), first("corridor"), "VERDANT: Gemeinschaftsgarten am Verkehrsverteiler");
  return relationships;
}

import * as cheerio from "cheerio";
import { readFileSync } from "node:fs";

const sport = process.argv[2] ?? "nba";
const html = readFileSync(`/tmp/covers_${sport}.html`, "utf8");
const $ = cheerio.load(html);

console.log(`# ${sport.toUpperCase()} gameboxes`);
const boxes = $(".gamebox");
console.log(`found ${boxes.length} gamebox elements`);

boxes.each((i, el) => {
  const $box = $(el);
  const cls = ($box.attr("class") ?? "").split(/\s+/).filter(Boolean);
  const state = cls.find((c) => /^(pregamebox|ingamebox|postgamebox)$/.test(c));
  const matchupHref = $box.find('a[href*="/matchup/"]').first().attr("href") ?? "";
  const idMatch = matchupHref.match(/\/matchup\/(\d+)/);
  const teamAnchors = $box
    .find(".gamebox-team-anchor")
    .map((_i, a) => $(a).text().trim().replace(/\s+/g, " "))
    .get();
  const teamImgAlts = $box
    .find(".gamebox-team-anchor img[alt]")
    .map((_i, img) => $(img).attr("alt")?.trim() ?? "")
    .get();
  const consensus = $box
    .find(".team-consensus")
    .map((_i, span) => $(span).text().trim().replace(/\s+/g, " "))
    .get();
  const time = $box.find(".gamebox-time").first().text().trim().replace(/\s+/g, " ");
  const header = $box.find(".gamebox-header").first().text().trim().replace(/\s+/g, " ");

  console.log(`\n--- gamebox #${i} ---`);
  console.log(`state: ${state}`);
  console.log(`matchupId: ${idMatch?.[1]}`);
  console.log(`matchupHref: ${matchupHref}`);
  console.log(`header: ${header}`);
  console.log(`time: ${time}`);
  console.log(`teamAnchors (${teamAnchors.length}):`, teamAnchors);
  console.log(`teamImgAlts (${teamImgAlts.length}):`, teamImgAlts);
  console.log(`team-consensus (${consensus.length}):`, consensus);
});

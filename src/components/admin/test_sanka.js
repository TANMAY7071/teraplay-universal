// test sanka apis

const DONGHUA_API_BASE = "https://www.sankavollerei.web.id/anime/donghua";
const DONGHUB_API_BASE = "https://www.sankavollerei.web.id/anime/donghub";

async function test() {
  try {
    console.log("Searching Donghua API for 'great ruler'...");
    const res1 = await fetch(`${DONGHUA_API_BASE}/search/great%20ruler`);
    const json1 = await res1.json();
    console.log("Donghua Search Results:", JSON.stringify(json1, null, 2).slice(0, 1000));

    if (json1 && json1.length > 0) {
      const firstSlug = json1[0].slug;
      console.log(`Fetching Donghua details for slug: ${firstSlug}...`);
      const detailRes = await fetch(`${DONGHUA_API_BASE}/detail/${firstSlug}`);
      const detailJson = await detailRes.json();
      console.log("Donghua Details:", JSON.stringify(detailJson, null, 2).slice(0, 1000));
    }

    console.log("\nSearching Donghub API for 'great ruler'...");
    const res2 = await fetch(`${DONGHUB_API_BASE}/search/great%20ruler`);
    const json2 = await res2.json();
    console.log("Donghub Search Results:", JSON.stringify(json2, null, 2).slice(0, 1000));

  } catch (err) {
    console.error("Error fetching Sanka APIs:", err);
  }
}

test();

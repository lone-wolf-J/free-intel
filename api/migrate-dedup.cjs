const { neon } = require("@neondatabase/serverless");

const DATABASE_URL = process.argv[2] || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error("Usage: node migrate-dedup.cjs <DATABASE_URL>"); process.exit(1); }

async function migrateDedup() {
  const sql = neon(DATABASE_URL);
  
  // Step 1: Find duplicates by normalized URL or slug
  console.log("Step 1: Finding duplicates by slug prefix (before last hyphen-segment)...");
  
  const allRows = await sql`SELECT id, slug, name, url, github_url, category, free_score, verification_status, created_at FROM resources ORDER BY created_at ASC`;
  
  // Normalize slug: "ollama-open-webui" → "ollama" (take first meaningful segment)
  function normalizeSlug(slug) {
    if (!slug) return "";
    return slug.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  
  // Group by likely canonical identity
  const groups = new Map();
  for (const row of allRows) {
    const slug = normalizeSlug(row.slug);
    const name = (row.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const url = (row.url || row.github_url || "").toLowerCase().replace(/\/+$/, "").replace(/^https?:\/\//, "");
    
    // Use name as primary key (most reliable for dedup)
    const key = name || slug;
    if (!key) continue;
    
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  
  let mergeCount = 0;
  let skipCount = 0;
  
  for (const [key, members] of groups) {
    if (members.length <= 1) continue;
    
    // Sort by: verified first, then by free_score desc, then by created_at ASC (keep oldest)
    members.sort((a, b) => {
      if (a.verification_status === "verified" && b.verification_status !== "verified") return -1;
      if (b.verification_status === "verified" && a.verification_status !== "verified") return 1;
      if ((b.free_score || 0) !== (a.free_score || 0)) return (b.free_score || 0) - (a.free_score || 0);
      return new Date(a.created_at) - new Date(b.created_at);
    });
    
    const keep = members[0];
    const duplicates = members.slice(1);
    
    console.log(`  Merging ${duplicates.length} duplicates into "${keep.name}" (id=${keep.id}, score=${keep.free_score})`);
    
    for (const dup of duplicates) {
      // Update alt_of references
      await sql`UPDATE resources SET alt_of = ${keep.name} WHERE alt_of = ${dup.name}`;
      await sql`UPDATE resources SET alt_of = ${keep.name} WHERE alt_of = ${dup.slug}`;
      
      // Update evidence references
      await sql`UPDATE evidence SET resource_id = ${keep.id} WHERE resource_id = ${dup.id}`;
      
      // Update events references
      await sql`UPDATE events SET resource_id = ${keep.id} WHERE resource_id = ${dup.id}`;
      
      // Delete the duplicate
      await sql`DELETE FROM resources WHERE id = ${dup.id}`;
      
      mergeCount++;
    }
    skipCount++;
  }
  
  console.log(`\nDone! Merged ${mergeCount} duplicate entries across ${skipCount} groups.`);
  console.log(`Remaining resources: ${allRows.length - mergeCount}`);
}

migrateDedup().catch(console.error);

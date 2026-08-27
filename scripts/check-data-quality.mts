import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Sd3Q5YBvbXhA@ep-rough-hat-axmc6d3z-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require');

// Check what resource_type values exist
const types = await sql`SELECT resource_type, COUNT(*) as n FROM resources GROUP BY resource_type ORDER BY n DESC`;
console.log('Resource types:', JSON.stringify(types));

// Check what origins exist
const origins = await sql`SELECT origin, COUNT(*) as n FROM resources GROUP BY origin ORDER BY n DESC`;
console.log('Origins:', JSON.stringify(origins));

// Check a few examples of "bad" resources that look like articles
const badExamples = await sql`SELECT slug, name, resource_type, origin, url, category FROM resources WHERE name ILIKE '%linkedin%' OR name ILIKE '%reddit%' OR name ILIKE '%pdf%' OR name ILIKE '%article%' OR name ILIKE '%post%' OR name ILIKE '%blog%' LIMIT 10`;
console.log('\nBad examples:', JSON.stringify(badExamples, null, 2));

// Check what the top-scoring resources look like
const topResources = await sql`SELECT slug, name, resource_type, origin, url, free_score FROM resources ORDER BY free_score DESC LIMIT 10`;
console.log('\nTop resources:', JSON.stringify(topResources, null, 2));

// Check categories
const cats = await sql`SELECT category, COUNT(*) as n FROM resources WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC LIMIT 20`;
console.log('\nCategories:', JSON.stringify(cats));

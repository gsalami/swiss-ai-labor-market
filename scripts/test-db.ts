/**
 * Test script for ruVector database integration
 * Run with: npx tsx scripts/test-db.ts
 */

import db from '../src/db/ruvector.js';

async function testDatabase() {
  console.log('=== ruVector Integration Test ===\n');

  try {
    // 1. Initialize
    console.log('1. Initializing database...');
    await db.init();
    console.log('   ✓ Database initialized\n');

    // 2. Insert test document
    console.log('2. Inserting test document...');
    await db.insert({
      id: 'test-doc-1',
      content: 'Die Schweizer IT-Branche erlebt durch KI-Technologien einen Wandel. Software-Entwickler müssen sich anpassen.',
      metadata: {
        source: 'news',
        title: 'KI verändert Schweizer IT-Branche',
        industry: 'IT',
        canton: 'ZH',
        date: '2024-01-15',
        tags: ['KI', 'IT', 'Arbeitsmarkt'],
      },
    });
    console.log('   ✓ Document inserted\n');

    // 3. Get document
    console.log('3. Retrieving document...');
    const doc = await db.get('test-doc-1');
    console.log(`   ✓ Retrieved: ${doc?.id}\n`);

    // 4. Search
    console.log('4. Semantic search...');
    const results = await db.search('Wie beeinflusst KI die IT-Branche?', { limit: 5 });
    console.log(`   ✓ Found ${results.length} results\n`);

    // 5. Update
    console.log('5. Updating document...');
    await db.update('test-doc-1', {
      metadata: {
        source: 'news',
        title: 'KI verändert Schweizer IT-Branche',
        industry: 'IT',
        canton: 'ZH',
        date: '2024-01-15',
        aiImpactScore: 8.5,
        tags: ['KI', 'IT', 'Arbeitsmarkt', 'Transformation'],
      },
    });
    console.log('   ✓ Document updated\n');

    // 6. Graph query
    console.log('6. Testing Cypher query...');
    const queryResults = await db.query(
      'MATCH (d:Document)-[:MENTIONS]->(e:Entity {type: "industry"}) RETURN d, e'
    );
    console.log(`   ✓ Query executed, ${queryResults.length} results\n`);

    // 7. Create relation
    console.log('7. Creating relation...');
    await db.createRelation('test-doc-1', 'entity-it-industry', 'MENTIONS', { confidence: 0.95 });
    console.log('   ✓ Relation created\n');

    // 8. Get stats
    console.log('8. Getting statistics...');
    const stats = await db.stats();
    console.log(`   ✓ Stats: ${JSON.stringify(stats)}\n`);

    // 9. Delete test document
    console.log('9. Cleaning up...');
    await db.remove('test-doc-1');
    console.log('   ✓ Test document deleted\n');

    // 10. Close
    await db.close();
    console.log('=== All tests passed! ===');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testDatabase();

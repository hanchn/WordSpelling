import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORDS_DIR = path.join(__dirname, '../words');

async function migrate() {
  console.log('Starting migration from .txt to .json...');
  
  const files = await glob('**/*.txt', { cwd: WORDS_DIR });
  
  for (const file of files) {
    const fullPath = path.join(WORDS_DIR, file);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    const words = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const parts = trimmed.split('#');
      const word = parts[0].trim();
      const definition = parts.length > 1 ? parts[1].trim() : '';
      
      if (word) {
        words.push({
          word,
          definition,
          phonetic: '', // Placeholder for future expansion
          examples: []  // Placeholder
        });
      }
    });

    // Construct JSON structure
    const dirName = path.dirname(file);
    const baseName = path.basename(file, '.txt');
    
    const jsonContent = {
      meta: {
        bookId: dirName === '.' ? 'Default' : dirName,
        unitId: baseName,
        title: baseName, // Could be improved with mapping
        version: "1.0"
      },
      words: words
    };

    // Write .json file
    const jsonPath = path.join(WORDS_DIR, dirName, `${baseName}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf-8');
    
    console.log(`Migrated ${file} -> ${jsonPath}`);
    
    // Optionally delete .txt file? Let's keep them for now or rename them.
    // await fs.unlink(fullPath); 
  }
  
  console.log('Migration complete!');
}

migrate().catch(console.error);

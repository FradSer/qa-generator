import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { Region } from '../../../config/config';

export async function POST(request: Request) {
  try {
    const newRegion: Region = await request.json();
    
    // Validate the new region data
    if (!newRegion.name || !newRegion.pinyin || !newRegion.description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Read the current config file
    const configPath = path.join(process.cwd(), 'config', 'config.ts');
    let configContent = await fs.readFile(configPath, 'utf-8');
    
    // Parse the regions array
    const regionsMatch = configContent.match(/export const regions: Region\[\] = \[([\s\S]*?)\];/);
    if (!regionsMatch) {
      return NextResponse.json({ error: 'Could not parse config file' }, { status: 500 });
    }
    
    // Add the new region
    const newRegionStr = `
  {
    name: "${newRegion.name}",
    pinyin: "${newRegion.pinyin}",
    description: "${newRegion.description}"
  },`;
    
    // Insert the new region before the closing bracket
    configContent = configContent.replace(
      /export const regions: Region\[\] = \[([\s\S]*?)\];/,
      `export const regions: Region[] = [${regionsMatch[1]}${newRegionStr}\n];`
    );
    
    // Write the updated config back to file
    await fs.writeFile(configPath, configContent, 'utf-8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding region:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
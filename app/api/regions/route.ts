import fs from 'fs/promises';
import { NextResponse, NextRequest } from 'next/server';
import path from 'path';
import { Region } from '../../../config/config';
import { InputValidator, ValidationError } from '../../../utils/input-validation';
import { APIAuthenticator } from '../../../utils/auth';

export const POST = APIAuthenticator.withAuth(async (request: NextRequest) => {
  try {
    const newRegion: Region = await request.json();
    
    // Validate the new region data
    if (!newRegion.name || !newRegion.pinyin || !newRegion.description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate and sanitize all fields to prevent injection
    try {
      const safeName = InputValidator.validateStringInput(newRegion.name, 'name', 100);
      const safePinyin = InputValidator.validateRegionPinyin(newRegion.pinyin);
      const safeDescription = InputValidator.validateStringInput(newRegion.description, 'description', 500);
      
      newRegion.name = safeName;
      newRegion.pinyin = safePinyin;
      newRegion.description = safeDescription;
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
    
    // Read the current config file
    const configPath = path.join(process.cwd(), 'config', 'config.ts');
    let configContent = await fs.readFile(configPath, 'utf-8');
    
    // Parse the regions array
    const regionsMatch = configContent.match(/export const regions: Region\[\] = \[([\s\S]*?)\];/);
    if (!regionsMatch) {
      return NextResponse.json({ error: 'Could not parse config file' }, { status: 500 });
    }
    
    // Add the new region with proper escaping to prevent code injection
    const escapedName = InputValidator.escapeTypeScriptString(newRegion.name);
    const escapedPinyin = InputValidator.escapeTypeScriptString(newRegion.pinyin);
    const escapedDescription = InputValidator.escapeTypeScriptString(newRegion.description);
    
    const newRegionStr = `
  {
    name: "${escapedName}",
    pinyin: "${escapedPinyin}",
    description: "${escapedDescription}"
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
});
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Simple secret check - ideally this should be an env var
    if (secret !== 'my-secret-admin-key') {
       return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const scriptDir = path.join(process.cwd(), 'scripts');

    // 1. Download
    console.log('Starting download...');
    await execPromise(`node ${path.join(scriptDir, 'download_and_process_gtfs.js')}`);

    // 2. Process
    console.log('Starting processing...');
    await execPromise(`node ${path.join(scriptDir, 'process_gtfs_data.js')}`);

    return NextResponse.json({ success: true, message: 'Routes updated successfully' });
  } catch (error: any) {
    console.error('Update failed:', error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

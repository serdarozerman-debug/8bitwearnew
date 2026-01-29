import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/3d-print/diagnose
 * 
 * Diagnostic endpoint to check Python setup
 */
export async function GET(req: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  }

  try {
    // 1. Check Python
    const pythonVersion = await new Promise<string>((resolve, reject) => {
      const python = spawn('python3', ['--version'])
      let output = ''
      
      python.stdout.on('data', (data) => { output += data.toString() })
      python.stderr.on('data', (data) => { output += data.toString() })
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim())
        } else {
          reject(new Error('Python not found'))
        }
      })
      
      python.on('error', (err) => reject(err))
    })
    
    diagnostics.checks.python = { status: 'OK', version: pythonVersion }
    
  } catch (error: any) {
    diagnostics.checks.python = { status: 'FAIL', error: error.message }
  }

  try {
    // 2. Check Python dependencies
    const depsCheck = await new Promise<string>((resolve, reject) => {
      const python = spawn('python3', ['-c', 'import PIL; import numpy; import stl; print("OK")'])
      let output = ''
      let errors = ''
      
      python.stdout.on('data', (data) => { output += data.toString() })
      python.stderr.on('data', (data) => { errors += data.toString() })
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim())
        } else {
          reject(new Error(errors || 'Dependencies missing'))
        }
      })
      
      python.on('error', (err) => reject(err))
    })
    
    diagnostics.checks.dependencies = { status: 'OK', result: depsCheck }
    
  } catch (error: any) {
    diagnostics.checks.dependencies = { status: 'FAIL', error: error.message }
  }

  try {
    // 3. Check Python script exists
    const scriptPath = path.join(process.cwd(), 'lib', 'python', 'png_to_stl.py')
    const scriptExists = existsSync(scriptPath)
    
    diagnostics.checks.script = {
      status: scriptExists ? 'OK' : 'FAIL',
      path: scriptPath,
      exists: scriptExists
    }
    
  } catch (error: any) {
    diagnostics.checks.script = { status: 'FAIL', error: error.message }
  }

  try {
    // 4. Check temp directory
    const tempDir = path.join('/tmp', '3d-print')
    const tempDirExists = existsSync(tempDir)
    
    diagnostics.checks.tempDir = {
      status: 'OK',
      path: tempDir,
      exists: tempDirExists
    }
    
  } catch (error: any) {
    diagnostics.checks.tempDir = { status: 'FAIL', error: error.message }
  }

  try {
    // 5. Check public directory
    const publicDir = path.join(process.cwd(), 'public', '3d-prints')
    const publicDirExists = existsSync(publicDir)
    
    diagnostics.checks.publicDir = {
      status: 'OK',
      path: publicDir,
      exists: publicDirExists
    }
    
  } catch (error: any) {
    diagnostics.checks.publicDir = { status: 'FAIL', error: error.message }
  }

  // Summary
  const allPassed = Object.values(diagnostics.checks).every((check: any) => check.status === 'OK')
  
  diagnostics.summary = {
    allPassed,
    message: allPassed 
      ? '✅ All checks passed! System ready for 3D printing.'
      : '❌ Some checks failed. See details above.'
  }

  return NextResponse.json(diagnostics, {
    status: allPassed ? 200 : 500
  })
}

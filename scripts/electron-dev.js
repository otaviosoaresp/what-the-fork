const { spawn } = require('child_process')
const { createServer } = require('vite')

async function startDev() {
  const server = await createServer({
    configFile: './vite.config.ts'
  })
  await server.listen()

  const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.node.json', '--watch'], {
    stdio: 'inherit',
    shell: true
  })

  setTimeout(() => {
    const electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    })

    electron.on('close', () => {
      tsc.kill()
      server.close()
      process.exit()
    })
  }, 3000)
}

startDev()

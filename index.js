const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const P = require('pino')
const readline = require('readline')
const usePairingCode = true
async function question(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans) }))
}
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal:!usePairingCode,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
        browser: ['Usith Mini', 'Chrome', '1.0.0']
    })
    if (usePairingCode &&!sock.authState.creds.registered) {
        const phoneNumber = await question('Usith, Phone Number eka danna (ex: 9477XXXXXXX): ')
        const code = await sock.requestPairingCode(phoneNumber.trim())
        console.log(`Pairing Code: ${code}`)
        console.log('WhatsApp > Linked Devices > Link with phone number > Code eka gahanna')
    }
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            if (reason!== DisconnectReason.loggedOut) { console.log('Reconnecting...'); startBot() }
            else { console.log('Logged Out') }
        } else if (connection === 'open') { console.log('✅ Usith Mini Connected!') }
    })
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
        const prefix = '.'
        if (!text.startsWith(prefix)) return
        const cmd = text.slice(1).trim().split(' ')[0].toLowerCase()
        const args = text.slice(1).trim().split(' ').slice(1).join(' ')
        if (cmd === 'ping') {
            await sock.sendMessage(from, { text: '*Pong!* 🏓\nUsith Mini Alive

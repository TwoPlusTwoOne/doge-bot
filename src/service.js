const messages = require('./messages');
const repository = require('./repository')

module.exports = function commands(robot, web) {
    const reactions = [
        'doge-cool',
        'doge',
        'doge2',
        'doge3d',
        'doge_gif',
        'doge3',
        'dogecoin',
        'parrot-doge',
        'doge_sunglasses',
    ]

    return { addDoge, getDoges, getHelp, getHistory, getInfo }

    async function addDoge(res) {
        const { room, user, rawText, thread_ts } = res.message;

        // If the :doge: is in the middle of the message, ignore
        if (!(/^:doge(.*):$/i).test(rawText)) {
            return
        }

        // If message was inside a thread, ignore
        if (thread_ts) {
            return
        }

        const { id: userId, name } = user;
        const isGoingTooFast = await checkDogeRate({ userId, room })
        if (isGoingTooFast) {
            const message = messages.getRateMessage()
            sendMessage({ res, message })
        } else {
            await repository.addDoge({ userId, room, userName: name });
            const roomUser = await repository.getRoomUser({ room, userId })
            const { doge_count: dogeCount } = roomUser
            const message = messages.getDogeMessage({ dogeCount, userId, })
            await repository.updateLastRequest({ userId, room })

            sendMessage({ res, message })
            addReactions({ message: res.message })
        }
    }

    async function getDoges(res) {
        const { room } = res.message;
        const roomUsers = await repository.getRoomUsersForRoom({ room })
        roomUsers.sort((a, b) => a.doge_count < b.doge_count ? 1 : -1)
        const message = messages.getDogeListMessage({ roomUsers, title: 'list' })

        sendMessage({ res, message })
    }

    async function getHelp(res) {
        const message = messages.helpMessage();
        sendMessage({ res, message })
    }

    async function getInfo(res) {
        const message = messages.infoMessage();
        sendMessage({ res, message })
    }

    async function getHistory(res) {
        const { room } = res.message
        const roomUsers = await repository.getRoomHistory({ room })
        // roomUsers.sort((a, b) => a.doge_count < b.doge_count ? 1 : -1)
        const message = messages.getDogeListMessage({ roomUsers, title: 'history' })

        sendMessage({ res, message })
    }

    function addReactions({ message }) {
        reactions.forEach(reaction => web.reactions.add({
            name: reaction,
            channel: message.rawMessage.channel,
            timestamp: message.rawMessage.ts,
        }))
    }

    async function checkDogeRate({ userId, room }) {
        const roomUser = await repository.getRoomUser({ room, userId })
        if (!roomUser || !roomUser.last_request_at) {
            return false
        }
        const lastRequest = new Date(roomUser.last_request_at).getTime()
        const now = Date.now()
        // one minutue
        return now - lastRequest < 60000
    }

    function sendMessage({ res, message }) {
        robot.adapter.client.web.chat.postMessage(
            res.message.user.room,
            message,
            { thread_ts: res.message.rawMessage.ts }
        );
    }
}
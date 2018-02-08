const net = require('net');
const config = require('./config/config');

var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = config.dbUrl;

//房间号
let roomid = config.roomId;

//创建连接
const s = net.connect({
    port: 8601,
    host: 'openbarrage.douyutv.com'
}, () => {
    console.log('弹幕服务器连接成功……');
});

//发送进入房间消息
var msg = 'type@=loginreq/roomid@=' + roomid + '/';
sendData(s, msg);
//发送请求分组消息
msg = 'type@=joingroup/rid@=' + roomid + '/gid@=-9999/';
sendData(s, msg);

//接收数据
s.on('data', (chunk) => {
    formatData(chunk);
});
//接收错误消息
s.on('error', (err) => {
    console.log(err);
});
//发送心跳消息，保持连接
setInterval(() => {
    // let timestamp = parseInt(new Date()/1000);
    let msg = 'type@=mrkl/';
    sendData(s, msg);
}, 45000);


/**
 * 发送数据方法
 */
function sendData(s, msg) {
    let data = new Buffer(msg.length + 13);
    data.writeInt32LE(msg.length + 9, 0);
    data.writeInt32LE(msg.length + 9, 4);
    data.writeInt32LE(689, 8);
    data.write(msg + '\0', 12);
    s.write(data);
}

/**
 * 格式化接收的消息
 * @param {*} msg 
 */
function formatData(msg) {
    const sliced = msg.slice(12).toString();
    // 减二删掉最后的'/'和'\0'
    const splited = sliced.substring(0, sliced.length - 2).split('/');
    const map = formatDanmu(splited);
    analyseDanmu(map);
}


/**
 * 将消息生成json
 * @param {*} msg 
 */
function formatDanmu(msg) {
    let map = {};
    for (let i in msg) {
        let splited = msg[i].split('@=');
        map[splited[0]] = splited[1];
    }
    return map;
}

/**
 * 处理消息
 * @param {*} msg 
 */
function analyseDanmu(msg) {
    if (msg['type'] == 'chatmsg') {
        // insertData(msg, "danmu");
        console.log("%s: %s", msg['nn'], msg['txt']);
    }
    if (msg['type'] == 'uenter') {
        // insertData(msg, "user");
        console.log(msg['nn'] +'进入了直播间');
    }
}

/**
 * 插入数据库方法
 */
function insertData(msg, c) {
    var data;
    MongoClient.connect(DB_CONN_STR, function (err, db) {
        if (c == "danmu") {
            data = [{
                //用户名
                'name': msg['nn'],
                //弹幕内容
                'text': msg['txt'],
                //用户等级
                'level': msg['level'],
                //发言房间号
                'rid': msg['rid'],
                //时间
                'time': new Date(),
                //弹幕颜色
                'col': msg['col']
            }];
        }
        if (c == "user") {
            data = [{
                'name': msg['nn'],
                'level': msg['level'],
                'rid': msg['rid'],
                'time': new Date()
            }];
        }
        var collection = db.collection(c);
        collection.insert(data, function (err, result) {
            db.close();
        });
    });
}
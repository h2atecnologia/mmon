#!/usr/bin/env node
'use strict';
// ==================================================================================
// index.js
// ----------------------------------------------------------------------------------
// Description:   mmon - micro monitor - System Information CLI tool
//                based on Node.js
// Copyright:     (c) 2016
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// Contributors:  -
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================

// ------------------------------------------------
// dependenciea
// ------------------------------------------------

let options = require('./lib/args');
let draw = require('./lib/draw');
let cols = require('./lib/cols');
let si = require('systeminformation');
let version = require('./package.json').version;
let _ = require('./lib/libObj');
let time = require('./lib/libTime');

let staticData = {};
let dynamicData = {};
let dockerData = [];
let primatyNet = {};

// ------------------------------------------------
// Params
// ------------------------------------------------

let interval = (options.i || options.interval || 3) * 1000;
if (interval < 1000) interval = 1000;
let dockerinterval = interval < 4000 ? interval * 2 : interval;

// ------------------------------------------------
// Calc + put together lines
// ------------------------------------------------

function machine_os() {
  let line = draw.strLeft((staticData.system.manufacturer + ' ' + staticData.system.model).trim(), 100);
  line = draw.strAddRight(line, staticData.os.distro + ' - ' + staticData.os.release + ' - Kernel: ' + staticData.os.kernel);
  return line;
}

function cpu_host() {
  let line = draw.strLeft(staticData.cpu.manufacturer + ' ' + staticData.cpu.brand + ' - ' + staticData.cpu.speed + ' GHz - ' + staticData.cpu.cores + ' Cores', 100);
  line = draw.strAddRight(line, 'Host: ' + staticData.os.hostname + (dynamicData && dynamicData.time && dynamicData.time.uptime ? ' - Uptime: ' + time.uptime(dynamicData.time.uptime) : ''));
  return line;
}

function calc_primary_net() {
  let iface_name = '';
  let iface_ip4 = '';
  let iface_ip6 = '';
  staticData.net.forEach(iface => {
    if (iface.internal == false) {
      iface_name = iface_name || iface.iface;
      iface_ip4 = iface_ip4 || iface.ip4;
      iface_ip6 = iface_ip6 || iface.ip6;
    }
  });
  return {
    iface: iface_name,
    ip4: iface_ip4,
    ip6: iface_ip6
  }
}
function calc_fs() {
  let size = 0;
  let used = 0;
  dynamicData.fsSize.forEach(fs => {
    size += fs.size;
    used += fs.used;
  });
  return {
    size: size,
    used: used,
    free: ((size && (size > used)) ? size - used : 0),
    use: (size ? 100.0 * used / size : 0)
  }
}

function calc_nwconn() {
  let all = dynamicData.networkConnections.length;
  let established = 0;
  let listen = 0;
  dynamicData.networkConnections.forEach(nwconn => {
    if (nwconn.state == 'LISTEN') listen++;
    if (nwconn.state == 'ESTABLISHED') established++;
  });
  return {
    all: all,
    established: established,
    listen: listen
  }
}

// ------------------------------------------------
// Outputs
// ------------------------------------------------

function startScreen() {
  primatyNet = calc_primary_net();
  draw.clear();
  console.log(cols.log(draw.strLeft(' mmon - System Information - Version ' + version, 100), 'black', 'gray'));
  console.log(machine_os());
  console.log(cpu_host());

  console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n');
  console.log('                                            STARTING ...');
  console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n');

  var footer = draw.strLeft(' SI-Version: ' + si.version() + '  Node: ' + process.versions.node + '  V8: ' + process.versions.v8, 100);
  footer = draw.strAddRight(footer, '(c) ' + new Date().getFullYear() + ' Sebastian Hildebrandt ');
  console.log(cols.log(footer, 'black', 'gray'));
  draw.hide();
}

function displayAll(first) {
  if (!first) draw.up(35);
  console.log(cols.log(draw.strLeft(' mmon - System Information - Version ' + version, 100), 'black', 'gray'));
  console.log(machine_os());
  console.log(cpu_host());
  console.log();

  let fssize = calc_fs();
  let nwconn = calc_nwconn();
//	console.log(cols.log('                                                    CPU           MEM           FS            DiskIO', 'white'));
  console.log('CPU: ' + draw.progress(dynamicData.currentLoad.currentload, 32, true, true) + '      ' + cols.log('CPU:  ', 'white') + ('  ' + dynamicData.currentLoad.currentload.toFixed(2)).substr(-5) + '  %   ' + cols.log('MEM:   ', 'white') + ('  ' + (dynamicData.mem.used / dynamicData.mem.total * 100).toFixed(2)).substr(-5) + ' %   ' + cols.log('FS:      ', 'white') + ('  ' + (fssize.use).toFixed(2)).substr(-5) + ' %');
  console.log('MEM: ' + draw.progress(dynamicData.mem.used / dynamicData.mem.total * 100, 32, true, true) + '      Speed:' + ('  ' + dynamicData.cpuCurrentspeed.avg.toFixed(2)).substr(-5) + 'GHz   ' + 'Total: ' + ('  ' + (dynamicData.mem.total / 1073741824.0).toFixed(2)).substr(-5) + 'GB   ' + 'Total: ' + ('    ' + (fssize.size / 1073741824.0).toFixed(2)).substr(-7) + 'GB');
  console.log('FS:  ' + draw.progress(fssize.use, 32, true, true) + '      Temp:' + (dynamicData.temp && dynamicData.temp.main && dynamicData.temp.main > 0 ? draw.fmtNum(dynamicData.temp.main, 2, 6, 70, 90) : '  -.--') + ' °C   ' + 'Free:  ' + ('  ' + (dynamicData.mem.free / 1073741824.0).toFixed(2)).substr(-5) + 'GB   ' + 'Free:  ' + ('    ' + (fssize.free / 1073741824.0).toFixed(2)).substr(-7) + 'GB');

  console.log();
  let lines = [];
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');

  lines[0] = lines[0] + cols.log('FS Stats', 'white');
  lines[1] = lines[1] + 'RX: ' + (dynamicData.fsStats.rx_sec >= 0 ? draw.fmtNum(dynamicData.fsStats.rx_sec, 2, 12, 500000, 1000000) + ' B/s' : ' -              ');
  lines[2] = lines[2] + 'WX: ' + (dynamicData.fsStats.wx_sec >= 0 ? draw.fmtNum(dynamicData.fsStats.wx_sec, 2, 12, 500000, 1000000) + ' B/s' : ' -              ');
  lines[3] = lines[3] + 'TX: ' + (dynamicData.fsStats.tx_sec >= 0 ? draw.fmtNum(dynamicData.fsStats.tx_sec, 2, 12, 500000, 1000000) + ' B/s' : ' -              ');

  lines[0] = lines[0] + '                 ' + cols.log('IOPS', 'white');
  lines[1] = lines[1] + '     ' + 'rIO: ' + (dynamicData.disksIO.rIO_sec >= 0 ? draw.fmtNum(dynamicData.disksIO.rIO_sec, 2, 8, 200, 500) + ' per s' : ' -            ');
  lines[2] = lines[2] + '     ' + 'wIO: ' + (dynamicData.disksIO.wIO_sec >= 0 ? draw.fmtNum(dynamicData.disksIO.wIO_sec, 2, 8, 200, 500) + ' per s' : ' -            ');
  lines[3] = lines[3] + '     ' + 'tIO: ' + (dynamicData.disksIO.tIO_sec >= 0 ? draw.fmtNum(dynamicData.disksIO.tIO_sec, 2, 8, 200, 500) + ' per s' : ' -            ');

  lines[0] = lines[0] + '                     ' + cols.log('NET:   ', 'white') + ('            ' + primatyNet.iface).substr(-12);
  lines[1] = lines[1] + '      ' + 'IP: ' + ('               ' + primatyNet.ip4).substr(-15);
  lines[2] = lines[2] + '      ' + 'RX: ' + (dynamicData.networkStats.rx_sec >= 0 ? draw.fmtNum(dynamicData.networkStats.rx_sec, 2, 11, 100000, 200000) + ' B/s' : ' -             ');
  lines[3] = lines[3] + '      ' + 'TX: ' + (dynamicData.networkStats.tx_sec >= 0 ? draw.fmtNum(dynamicData.networkStats.tx_sec, 2, 11, 100000, 200000) + ' B/s' : ' -             ');

  lines[0] = lines[0] + '   ' + cols.log('NW-Connect.', 'white');
  lines[1] = lines[1] + '   All:    ' + draw.fmtNum(nwconn.all, 0, 3);
  lines[2] = lines[2] + '   Establ: ' + draw.fmtNum(nwconn.established, 0, 3);
  lines[3] = lines[3] + '   Listen: ' + draw.fmtNum(nwconn.listen, 0, 3);

  lines[0] = lines[0] + '   ' + cols.log('Processes', 'white');
  lines[1] = lines[1] + '   All:     ' + draw.fmtNum(dynamicData.processes.all, 0, 4);
  lines[2] = lines[2] + '   Running: ' + draw.fmtNum(dynamicData.processes.running, 0, 4);
  lines[3] = lines[3] + '   Blocked: ' + draw.fmtNum(dynamicData.processes.blocked, 0, 4);

  lines.forEach(line => {
    console.log(line)
  });

  // Raster FS und UserUser
  lines = [];
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');

  // File System
  lines[0] = lines[0] + cols.log('File System', 'white') + '          Mointpoint       Used %      ';
  for (let i = 1; i <= 5; i++) {
    //console.log(dynamicData.fsSize[i-1]);
    if (i <= dynamicData.fsSize.length) {
      if (i < 5 || dynamicData.fsSize.length == 5) {
        lines[i] = lines[i] + draw.strLeft(dynamicData.fsSize[i - 1].fs, 20) + ' ' + draw.strLeft(dynamicData.fsSize[i - 1].mount, 15) + ' ' + draw.fmtNum(dynamicData.fsSize[i - 1].use, 2, 6, 70, 85) + '%      ';
      } else {
        lines[i] = lines[i] + '+' + draw.fmtNum(dynamicData.fsSize.length - 4, 0, 2) + ' more Mounts...                              ';

      }
    } else {
      lines[i] = lines[i] + ' '.repeat(50);
    }
  }

  // Users
  lines[0] = lines[0] + cols.log('Users online', 'white') + '   TTY      IP                    DATE';
  for (let i = 1; i <= 5; i++) {
    if (i <= dynamicData.users.length) {
      if (i < 5 || dynamicData.users.length == 5) {
        lines[i] = lines[i] + draw.strLeft(dynamicData.users[i - 1].user, 14) + ' ' + draw.strLeft(dynamicData.users[i - 1].tty, 8) + ' ' + draw.strLeft(dynamicData.users[i - 1].ip, 15) + ' ' + draw.strRight(dynamicData.users[i - 1].date, 10)
      } else {
        lines[i] = lines[i] + '+' + draw.fmtNum(dynamicData.users.length - 4, 0, 2) + ' more users online...';
      }
    } else {
      lines[i] = lines[i] + ' '.repeat(50);
    }
  }

  console.log();
  lines.forEach(line => {
    console.log(line)
  });

  // Raster Docker
  lines = [];
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');

  // Docker
  lines[0] = lines[0] + cols.log('Docker Container', 'white') + '          ID          Image                PORTS                       CPU%     MEM%';
  for (let i = 1; i <= 5; i++) {
    if (i <= dockerData.length) {
      if (i < 5 || dockerData.length == 5) {
        let ports = '';
        dockerData[i - 1].ports.forEach(port => {
          ports = ports + (port.PrivatePort ? port.PrivatePort : '?') + ':' + (port.PublicPort ? port.PublicPort : '?') + ' ';
        });
//        lines[i] = lines[i] + draw.strLeft(dockerData[i - 1].name, 25) + ' ' + draw.strLeft(dockerData[i - 1].id, 10) + ' ' + draw.strLeft(dockerData[i - 1].image, 25) + ' ' + draw.strLeft(ports, 20) + ' ' + draw.fmtNum(dockerData[i - 1].cpu_percent, 2, 6, 70, 85) + '% ' + ' ' + draw.fmtNum(dockerData[i - 1].mem_percent, 2, 6, 70, 85) + '% ';
        lines[i] = lines[i] + draw.strLeft(dockerData[i - 1].name, 25) + ' ' + draw.strLeft(dockerData[i - 1].id, 10) + '  ' + draw.strLeft(dockerData[i - 1].image, 19) + '  ' + draw.strLeft(ports, 24) + ' ' + (dockerData[i - 1].state == 'running' ? draw.fmtNum(dockerData[i - 1].cpu_percent, 2, 6, 70, 85) + '% ' + ' ' + draw.fmtNum(dockerData[i - 1].mem_percent, 2, 6, 70, 85) + '%' : draw.strRight(dockerData[i - 1].state, 16));
      } else {
        lines[i] = lines[i] + '+' + draw.fmtNum(dockerData.length - 4, 0, 2) + ' more Docker Containers...';
      }
    } else {
      lines[i] = ' '.repeat(100);
    }
  }
  if (dockerData.length == 0) {
    lines[3] = cols.log('                                   No Docker Containers found ...', 'darkgray')
  }

  console.log();
  lines.forEach(line => {
    console.log(line)
  });

  lines = [];
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');

  lines[0] = lines[0] + cols.log('MISC:', 'white');
  lines[1] = lines[1] + 'Internet Latency : ' + (dynamicData.inetLatency >= 0 ? draw.fmtNum(dynamicData.inetLatency, 2, 8, 2000, 5000) + ' ms' : ' -              ');
  lines[2] = lines[2] + 'Battery Level    :   ' + (dynamicData.battery.hasbattery ? draw.fmtNum(dynamicData.battery.percent, 1, 5) + '%' + (dynamicData.battery.ischarging ? ' !!' : '   ') : ' ---- ');

  console.log();
  lines.forEach(line => {
    console.log(line)
  });
  console.log();

  /*
   lines[0] = draw.strAdd(lines[0], , 25);
   lines[1] = draw.strAdd(lines[1], , 25);
   lines[2] = draw.strAdd(lines[2], , 25);
   lines[3] = draw.strAdd(lines[3], , 25);

   console.log();
   console.log(cols.log('NET: ', 'white') + ('           ' + primatyNet.iface.substr(-11)));
   console.log('IP: ' + ('               ' + primatyNet.ip4).substr(-15));
   console.log('RX: ' + (dynamicData.networkStats.rx_sec >= 0 ? draw.fmtNum(dynamicData.networkStats.rx_sec, 2, 11, 100000, 200000) + ' B/s' : ' -'));
   console.log('TX: ' + (dynamicData.networkStats.tx_sec >= 0 ? draw.fmtNum(dynamicData.networkStats.tx_sec, 2, 11, 100000, 200000) + ' B/s' : ' -'));
   */
  // console.log(cols.log('NET:     ', 'white') + ('  ' + (fssize.use).toFixed(2)).substr(-5) + '%');
  // console.log('Total: ' + ('    ' + (fssize.size / 1073741824.0).toFixed(2)).substr(-7) + 'GB');
  // console.log('Free:  ' + ('    ' + (fssize.free / 1073741824.0).toFixed(2)).substr(-7) + 'GB');

  //console.log('\n\n\n\n');

  var footer = draw.strLeft(' SI-Version: ' + si.version() + '  Node: ' + process.versions.node + '  V8: ' + process.versions.v8, 100);
  footer = draw.strAddRight(footer, '(c) ' + new Date().getFullYear() + ' Sebastian Hildebrandt ');
  console.log(cols.log(footer, 'black', 'gray'));
  draw.hide();
}

// ------------------------------------------------
// handle exits
// ------------------------------------------------
function exitHandler(options, err) {
  if (options.cleanup) { }
  if (err) { }	//console.log(err.stack);
  if (options.exit) {
    draw.show();
    draw.clear();
    process.exit();
  }
}

process.on('exit', exitHandler.bind(null, { cleanup: true }));              // do something when app is closing
process.on('SIGINT', exitHandler.bind(null, { exit: true }));               // catches ctrl+c event
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));    // catches uncaught exceptions
process.on('exit', function () { });

// ------------------------------------------------
// handle key stroke
// ------------------------------------------------
let stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', function (key) {
  // q OR ctrl-c ( end of text )
  if (key === 'q' || key === '\u0003') {
    draw.show();
    draw.clear();
    process.exit();
  }
  // write the key to stdout all normal like
  //process.stdout.write(key);
});

// ------------------------------------------------
// main loop
// ------------------------------------------------

si.getStaticData().then(resultStatic => {
  staticData = resultStatic;
  startScreen();

  si.getDynamicData().then(resultDynamic => {
    dynamicData = resultDynamic;
    si.dockerAll().then(resultDocker => {
      dockerData = resultDocker;
    });
    draw.up(17);
    draw.clearline();
    draw.up(18);
    //draw.clear()
    displayAll(true);
    setInterval(function () {
      si.getDynamicData().then(resultDynamic => {
        _.merge(dynamicData, resultDynamic);
        displayAll(false);
      })
    }, interval);
    setInterval(function () {
      si.dockerAll().then(resultDocker => {
        dockerData = resultDocker;
      })
    }, dockerinterval)
  });

});



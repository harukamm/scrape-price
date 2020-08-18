const $ = require("jquery");

const fs = require("fs");
const cheerio = require("cheerio");
const got = require("got");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");

function createTransport() {
  return nodemailer.createTransport(
    smtpTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      auth: {
        user: "harukam.me@gmail.com",
        pass: process.env.PASSWORD
      }
    })
  );
}

function sendEmail(title, text, dist) {
  const trasport = createTransport();
  const message = {
    from: "Harukam Me <harukam.me@gmail.com>",
    to: dist,
    subject: title,
    text: text
  };
  trasport.sendMail(message, error => {
    if (error) {
      console.log("failed to send email");
      console.log(error);
    }
  });
  trasport.close();
}

function getNumber(str) {
  var x = "";
  for (var i = 0; i < str.length; i++) {
    const c = str[i];
    if (!Number(isNaN(parseInt(c)))) {
      x += c;
    }
  }
  return x.length == 0 ? NaN : parseInt(x);
}

function getPrice(url, callback, errCallback) {
  got(url)
    .then(response => {
      try {
        const x = cheerio.load(response.body);
        const price = x(
          ".a-size-large.a-color-price.olpOfferPrice.a-text-bold"
        );
        const keys = Object.keys(price);
        const result = [];
        for (var i = 0; i < keys.length; i++) {
          const k = keys[i];
          const knum = parseInt(k);
          if (!Number.isNaN(knum)) {
            const v = price[k];
            const p = v["children"][0]["data"];
            result.push(getNumber(p));
          }
        }
        result.sort();
        callback(result);
      } catch (e) {
        errCallback(e);
      }
    })
    .catch(err => {
      errCallback(err);
    });
}

function sendEmailAll(title, message, addrs) {
  for (var i = 0; i < addrs.length; i++) {
    const addr = addrs[i];
    sendEmail(title, message, addr);
  }
}

function seePriceAndNotice(url, title, expectedMin) {
  const addrs = ["harukam0416@gmail.com"];
  getPrice(
    url,
    d => {
      console.log("> checking... " + new Date());
      console.log(d);
      const min = d[0];
      if (expectedMin <= min) {
        console.log("minimum is too high: " + min);
        sound("no");
      } else {
        console.log("will send mail!");
        sound("succ");
        sendEmailAll(
          title,
          "最小価格変更: " +
            min +
            "\n\n" +
            url,
          addrs
        );
      }
    },
    e => {
      console.log("error callback is called!");
      console.log(e);
      sound("fail");
      // sendEmailAll("例外発生！", JSON.stringify(e), addrs);
    }
  );
}

async function sleep(t) {
  return await new Promise(r => {
    setTimeout(() => {
      r();
    }, t);
  });
}

function sound(state) {
  var file;
  var gain;
  switch(state) {
    case "succ":
      file = "/home/harukam2/ding.mp3";
      gain = 99999;
      break;
    case "fail":
      file = "/home/harukam2/bad.mp3";
      gain = 10;
      break;
    default:
      file = "/home/harukam2/done.mp3";
      gain = 10;
  }
  const options = {
      filename: file,
      gain: gain,
      debug: false,
      player: "mpg123",   // other supported players are 'aplay', 'mpg123', 'mpg321'
      device: "plughw0:0"
  }
  // instantiation with options
  const soundplayer = require("sound-player")
  const player = new soundplayer(options)
  player.play();
}

if (!process.env.PASSWORD) {
  throw "Provide password";
}

const url = "https://www.amazon.co.jp/gp/offer-listing/B07XV8VSZT/ref=dp_olp_new?ie=UTF8&condition=new";
const title = "リングフィットアドベンチャー";
const expectedMin = 10000;

seePriceAndNotice(url, title, expectedMin);
const interval = 10 * 1000;

const tmp = async () => {
  while (true) {
    console.log("start inside loop");
    await sleep(interval);
    seePriceAndNotice(url, title, expectedMin);
  }
};

tmp();

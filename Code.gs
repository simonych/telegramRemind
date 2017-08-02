var API_TOKEN = '399658678:AAEehzfDRL8Fa8AuRr0o-vcu-dX7x2q_Sr0';
var USER_ID = "107924620";

// @see https://goo.gl/c9JpnF - логгинг
// @see https://goo.gl/Gq8m42 - веб-хук для бота и пример обработки команд
// @see https://tlgrm.ru/docs/bots/api#sendmessage - отправка сообщения боту

function test() {
  var chatId = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("settings").getRange("B3").getValue();
  
  //putReminder("Прраздник. Цветы. 23 августа в 17:55", chatId);
  //moveReminder(9, 15, chatId);
  
  //var id = 9;
  //var date = getReminder(id).date;
  //var days = date.getDays();
  //date.setDays((days+7) % 7);
  //setReminder(id, date, chatId);
  
  var text = '/at 9 1231231';
  var params = text.match(/(\d+)/);
  if (!params) {
    sendText("Ошибка установки: не указаны параметры.", chatId);
  }
  var id = params[0];
  var stamp = text.replace("/at " + id + ' ', '');
  var result = ParseDate(stamp);
  setReminder(Number(id), result.date, chatId);
  
}

function doGet(e) {
  if (e) {
    doPost(e);
  }
}

function doPost(e) {
  var update = JSON.parse(e.postData.contents);
  console.log({message: 'doPost', parameters: update});
  
  // Make sure this is update is a type message
  if (update.hasOwnProperty('message')) {
    var msg = update.message;
    
    var chatId = msg.chat.id; SpreadsheetApp.getActiveSpreadsheet().getSheetByName("settings").setActiveSelection('B3').setValue(chatId);    
    var userId = msg.from.id;
    if (userId != USER_ID) {
      console.log({message: 'Запрещенный userId', value: userId});
      return;
    }

    // Make sure the update is a command.
    if (msg.hasOwnProperty('entities') && msg.entities[0].type == 'bot_command') {
      if ('/help' == msg.text || '/start' == msg.text) {
        var message = HtmlService.createTemplateFromFile('Commands').getRawContent();
        sendText(message, chatId);
      } else if ('/list' == msg.text) {
        listReminders(chatId);
      } else if (/\/delete/.test(msg.text)) {
        deleteReminder(Number(msg.text.replace(/\/delete /g, '')), chatId);
      } else if (/\/after/.test(msg.text)) {
        var params = msg.text.match(/(\d+)/g);
        if (!params) {
          sendText("Ошибка переноса: не указаны параметры команды.", chatId);
        }
        moveReminder(Number(params[0]), Number(params[1]), chatId);
      } else if (/\/at/.test(msg.text)) {
        var text = msg.text;
        var params = text.match(/(\d+)/);
        if (!params) {
          sendText("Ошибка установки: не указаны параметры.", chatId);
        }
        var id = params[0];
        var stamp = text.replace("/at " + id + ' ', '');
        var result = ParseDate(stamp);
        setReminder(Number(id), result.date, chatId);
      }
    } else {
      putReminder(msg.text, chatId);
    }    
  } else if (update.hasOwnProperty('callback_query')) {
    var callback = update.callback_query;
    
    var chatId = callback.message.chat.id; SpreadsheetApp.getActiveSpreadsheet().getSheetByName("settings").setActiveSelection('B3').setValue(chatId);
    var userId = callback.from.id;
    if (userId != USER_ID) {
      console.log({message: 'Запрещенный userId', value: userId});
      return;
    }
    
    var query = callback.data;
    if        (/\/delete/.test(query)) {
      deleteReminder(Number(query.replace(/\/delete /g, '')), chatId);
    } else if (/\/quarter/.test(query)) {
      moveReminder(Number(query.replace(/\/quarter /g, '')), 15, chatId);
    } else if (/\/one/.test(query)) {
      moveReminder(Number(query.replace(/\/one /g, '')), 60, chatId);
    } else if (/\/two/.test(query)) {
      moveReminder(Number(query.replace(/\/two /g, '')), (2 * 60), chatId);
    } else if (/\/day/.test(query)) {
      var id = Number(query.replace(/\/day /g, ''));
      var date = getReminder(id).date;
      setReminder(id, new Date(date.getTime() + 60000 * (24 * 60)), chatId);      
    } else if (/\/week/.test(query)) {
      var id = Number(query.replace(/\/week /g, ''));
      var date = getReminder(id).date;
      setReminder(id, new Date(date.getTime() + 60000 * (24 * 60 * 7)), chatId);      
    } else if (/\/month/.test(query)) {      
      var id = Number(query.replace(/\/month /g, ''));
      var date = getReminder(id).date;
      var month = date.getMonth();
      date.setMonth((month+1) % 12);
      setReminder(id, date, chatId);
    } else if (/\/year/.test(query)) {      
      var id = Number(query.replace(/\/year /g, ''));
      var date = getReminder(id).date;
      var year = date.getYear();
      date.setYear(year+1);
      setReminder(id, date, chatId);
    }
  }
}

function putReminder(text, chatId) {
  var result = ParseDate(text);
  console.log({message: 'putReminder', value: result});
  if (result.date) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("reminders");
    var lastRow = sheet.getLastRow() + 1;
    
    var remindDate = result.date;
    if (result.sms) {
      var smsText = result.sms;
      var minutes = Number(smsText.match(/(\d+)/g)[0]);
      if (minutes) {
        remindDate = new Date(remindDate.getTime() - 60000 * minutes);
      }
    }    
    
    sheet.setActiveSelection('B' + lastRow).setValue(remindDate);
    sheet.setActiveSelection('C' + lastRow).setValue(text);     
    sheet.setActiveSelection('D' + lastRow).setValue(result.title);     
    
    var template = HtmlService.createTemplateFromFile('Answer').getRawContent();
    var message = template.replace(/%id/g, (lastRow-1)).replace(/%message/g, text).replace(/%date/g, Utilities.formatDate(remindDate, ss.getSheetByName("settings").getRange("B1").getValue(), 'dd/MM/yyyy HH:mm'));
    sendText(message, chatId);
  } else {
    sendText("Не понял.", chatId);
  }
}

function moveReminder(id, minutes, chatId) {
  if (!id) {
    sendText("Ошибка переноса: не указан ID напоминания...", chatId);
    return;
  }
  console.log({message: 'moveReminder', parameters: id});
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("reminders");
  var lastRow = sheet.getLastRow();
  var row = id + 1;
  if (row > lastRow) { // Нет такого напоминания
    sendText("Ошибка переноса: не найдено напоминание <" + id  + ">...", chatId);
    return;
  }  
  sheet.setActiveSelection('A' + row).setValue('');
  var curDate = new Date();
  curDate = new Date(curDate.getTime() + 60000 * minutes);
  sheet.setActiveSelection('B' + row).setValue(curDate);
  
  var template = HtmlService.createTemplateFromFile('List').getRawContent();
  var message = template.replace(/%id/g, id).replace(/%message/g, sheet.getRange('C' + row).getValue()).replace(/%date/g, Utilities.formatDate(curDate, ss.getSheetByName("settings").getRange("B1").getValue(), 'dd/MM/yyyy HH:mm'));
  
  sendText(Utilities.formatString('Переместил: %s ', message), chatId);
}

function setReminder(id, date, chatId) {
  if (!id) {
    sendText("Ошибка установки: не указан ID напоминания...", chatId);
    return;
  }
  console.log({message: 'setReminder', parameters: id});
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("reminders");
  var lastRow = sheet.getLastRow();
  var row = id + 1;
  if (row > lastRow) { // Нет такого напоминания
    sendText("Ошибка установки: не найдено напоминание <" + id  + ">...", chatId);
    return;
  }  
  sheet.setActiveSelection('A' + row).setValue('');
  sheet.setActiveSelection('B' + row).setValue(date);
  
  var template = HtmlService.createTemplateFromFile('List').getRawContent();
  var message = template.replace(/%id/g, id).replace(/%message/g, sheet.getRange('C' + row).getValue()).replace(/%date/g, Utilities.formatDate(date, ss.getSheetByName("settings").getRange("B1").getValue(), 'dd/MM/yyyy HH:mm'));
  
  sendText(Utilities.formatString('Установил: %s ', message), chatId);
}

function getReminder(id) {
  if (!id) {
    return;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("reminders");
  var lastRow = sheet.getLastRow();
  var row = id + 1;
  if (row > lastRow) { // Нет такого напоминания
    return;
  }  
  return {date: sheet.getRange('B' + row).getValue(), note: sheet.getRange('C' + row).getValue(), done: sheet.getRange('A' + row).getValue()};
}


function deleteReminder(id, chatId) {
  if (!id) {
    sendText("Ошибка удаления: не указан ID напоминания...", chatId);
    return;
  }
  console.log({message: 'deleteReminder', parameters: id});
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("reminders");
  var lastRow = sheet.getLastRow();
  var row = id + 1;  
  if (row > lastRow) { // Нет такого напоминания
    sendText("Ошибка удаления: не найдено напоминание <" + id  + ">...", chatId);
    return;
  }
  var cell = 'A' + row;
  if (sheet.getRange(cell).getValue()) { // Нет смысла удалять повторно
    sendText("Ошибка удаления: напоминание <" + id + "> уже удалено...", chatId);
    return;
  }  
  sheet.setActiveSelection(cell).setValue(new Date());
  
  var template = HtmlService.createTemplateFromFile('List').getRawContent();
  var message = template.replace(/%id/g, id).replace(/%message/g, sheet.getRange('C' + row).getValue()).replace(/%date/g, Utilities.formatDate(sheet.getRange('A' + row).getValue(), ss.getSheetByName("settings").getRange("B1").getValue(), 'dd/MM/yyyy HH:mm'));
  
  sendText(Utilities.formatString('Удалил: %s ', message), chatId);
}

function listReminders(chatId) {
  console.log({message: 'listReminders', parameters: chatId});
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("reminders");
  var lastRow = sheet.getLastRow() + 1;
  var curDate = new Date();
  var count = 0;
  for(var i=2, iLen=lastRow; i<iLen; i++) {    
    var lastDate = sheet.getRange('A' + i).getValue();
    var nextDate = sheet.getRange('B' + i).getValue();
    var text = sheet.getRange('C' + i).getValue();
    if (!lastDate) {
      id = i-1;
      
      var template = HtmlService.createTemplateFromFile('List').getRawContent();
      var message = template.replace(/%id/g, id).replace(/%message/g, text).replace(/%date/g, Utilities.formatDate(nextDate, ss.getSheetByName("settings").getRange("B1").getValue(), 'dd/MM/yyyy HH:mm'));
      
      var deleteButton = {
        text: 'Delete',
        callback_data: "/delete " + id
      };
      var reply_markup = {};
      reply_markup.inline_keyboard = [];
      reply_markup.inline_keyboard.push([deleteButton]);
      
      sendText(message, chatId, JSON.stringify(reply_markup));
      count++;
    }
  }
  if (count == 0) {
      sendText("Напоминаний нет...", chatId);
  }
}

function remind() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("reminders");
  var lastRow = sheet.getLastRow() + 1;
  var curDate = new Date();
  console.log({message: 'remind', parameters: lastRow});
  for(var i = 2, iLen = lastRow; i < iLen; i++) {
    var lastDate = sheet.getRange('A' + i).getValue();
    var nextDate = sheet.getRange('B' + i).getValue();
    var text = sheet.getRange('C' + i).getValue();
    if (!lastDate) {
      if (curDate >= nextDate) {
        var template = HtmlService.createTemplateFromFile('Reminder').getRawContent();
        var message = template.replace(/%message/g, text);
        
        id = i - 1; 
         
        var quarterButton = {
          text: 'четверть часа',
          callback_data: "/quarter " + id
        };
        var oneButton = {
          text: 'час',
          callback_data: "/one " + id
        };
        var twoButton = {
          text: 'два часа',
          callback_data: "/two " + id
        };
        var dayButton = {
          text: 'день',
          callback_data: "/day " + id
        };
        var weekButton = {
          text: 'неделю',
          callback_data: "/week " + id
        };
        var monthButton = {
          text: 'месяц',
          callback_data: "/month " + id
        };
        var yearButton = {
          text: 'год',
          callback_data: "/year " + id
        };
        var reply_markup = {};
        reply_markup.inline_keyboard = [];
        reply_markup.inline_keyboard.push([quarterButton, oneButton, twoButton]);
        reply_markup.inline_keyboard.push([dayButton, weekButton, monthButton, yearButton]);

        sendText(message, ss.getSheetByName("settings").getRange("B3").getValue(), JSON.stringify(reply_markup));
        sheet.setActiveSelection('A' + i).setValue(new Date());
      } 
    }
  }
}

function sendText(text, chatId, keys) {
    var payload = {
      'method': 'sendMessage',
      'chat_id': String(chatId),
      'text': text,
      'parse_mode': 'Markdown',
      'reply_markup': keys
    }    
    var data = {
      "method": "post",
      "payload": payload
    }    
    UrlFetchApp.fetch('https://api.telegram.org/bot' + API_TOKEN + '/', data);
}

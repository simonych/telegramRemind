// @see https://goo.gl/c9JpnF - логгинг
// @see https://goo.gl/Gq8m42 - веб-хук для бота и пример обработки команд
// @see https://tlgrm.ru/docs/bots/api#sendmessage - отправка сообщения боту

function test() {
  var chatId = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("settings").getRange("CHAT_ID").getValue();
  
  putReminder("Напомни через одну минуту #1", chatId);
  //moveReminder(9, 15, chatId);
}

function doGet(e) {
  if (e) {
    doPost(e);
  }
}

function doPost(e) {
  var update = JSON.parse(e.postData.contents);
  console.log({message: 'doPost', parameters: update});
  
  // Получаю команду
  var command = '';
  if (update.hasOwnProperty('message')) {
    var msg = update.message;
    var chatId = msg.chat.id;
    var userId = msg.from.id;
    command = msg.text;
  } else if (update.hasOwnProperty('callback_query')) {
    var callback = update.callback_query;
    var chatId = callback.message.chat.id;
    var userId = callback.from.id;
    command = update.callback_query.data;
  }
  
  // This is only for one user implementation
  if (userId != SpreadsheetApp.getActiveSpreadsheet().getSheetByName("settings").getRange("USER_ID").getValue()) {
    console.log({message: 'Запрещенный userId', value: userId});
    return;
  }
  
  // Получаю команду  
  if (/start/i.test(command) || /help/i.test(command)) {
    var message = HtmlService.createTemplateFromFile('Commands').getRawContent();
    
    var helpButton = {
      text: 'Help',
      callback_data: '/help'
    };
    var listButton = {
      text: 'List',
      callback_data: '/list'
    };
    var examplesButton = {
      text: 'Examples',
      callback_data: '/examples'
    };
    var keyboard = {};
    keyboard.resize_keyboard = true;
    keyboard.one_time_keyboard = true;
    keyboard.keyboard = [];
    keyboard.keyboard.push([listButton, helpButton, examplesButton]);
    
    sendText(message, chatId, JSON.stringify(keyboard));
  } else if (/list/i.test(command)) {
    listReminders(chatId);
  } else if (/examples/i.test(command)) {
    sendText(HtmlService.createTemplateFromFile('Examples').getRawContent(), chatId);
  } else if (/delete/i.test(command)) {
    deleteReminder(Number(command.replace(/\/delete /g, '')), chatId);
  } else if (/after/i.test(command)) {
    var params = command.match(/(\d+)/g);
    if (!params) {
      sendText("Ошибка переноса: не указаны параметры команды.", chatId);
    }
    moveReminder(Number(params[0]), Number(params[1]), chatId);
  } else if (/at/i.test(command)) {
    var text = command;
    var params = text.match(/(\d+)/);
    if (!params) {
      sendText("Ошибка установки: не указаны параметры.", chatId);
    }
    var id = params[0];
    var stamp = text.replace("/at " + id + ' ', '');
    var result = ParseDate(stamp);
    setReminder(Number(id), result.date, chatId);
  } else if (/quarter/i.test(command)) {
    moveReminder(Number(command.replace(/\/quarter /g, '')), 15, chatId);
  } else if (/one/i.test(command)) {
    moveReminder(Number(command.replace(/\/one /g, '')), 60, chatId);
  } else if (/two/i.test(command)) {
    moveReminder(Number(command.replace(/\/two /g, '')), (2 * 60), chatId);
  } else if (/day/i.test(command)) {
    var id = Number(command.replace(/\/day /g, ''));
    var date = getReminder(id).date;
    setReminder(id, new Date(date.getTime() + 60000 * (24 * 60)), chatId);      
  } else if (/week/i.test(command)) {
    var id = Number(command.replace(/\/week /g, ''));
    var date = getReminder(id).date;
    setReminder(id, new Date(date.getTime() + 60000 * (24 * 60 * 7)), chatId);      
  } else if (/month/i.test(command)) {      
    var id = Number(command.replace(/\/month /g, ''));
    var date = getReminder(id).date;
    var month = date.getMonth();
    date.setMonth((month+1) % 12);
    setReminder(id, date, chatId);
  } else if (/year/i.test(command)) {      
    var id = Number(command.replace(/\/year /g, ''));
    var date = getReminder(id).date;
    var year = date.getYear();
    date.setYear(year+1);
    setReminder(id, date, chatId);
  } else {
    putReminder(command, chatId);
  }
}

function putReminder(text, chatId) {
  console.log('putReminder("%s", "%d")', text.trim(), chatId);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("reminders");
  var lastRow = sheet.getLastRow() + 1;
    
  if ("" == text.trim()) {
    sendText("Не понял.", chatId);
    return;
  }
  var remindText = text.trim();
  var result = ParseDate(text);
  var remindDate = result.date;
  if (/^Напомни /i.test(remindText) && remindDate) {
    var remind = ss.getSheetByName("settings").getRange("TEXT").getValue();
    if (remind) {
      remindText = remind;
    } else {
      remindText = remindText.replace(/^Напомни[\s\wа-яА-Я:]*\.\s*/, "").trim();
      if (!remindText) {
        sendText(HtmlService.createTemplateFromFile('About').getRawContent().replace(/%date/g, Utilities.formatDate(remindDate, ss.getSheetByName("settings").getRange("TIME_ZONE").getValue(), 'dd/MM/yyyy HH:mm')).trim(), chatId);
        ss.getSheetByName("settings").setActiveSelection('DATE').setValue(remindDate);
        return;
      }
    }
  } else if (/^:\s*/.test(remindText)) {
    var date = ss.getSheetByName("settings").getRange("DATE").getValue();
    if (date) {
      remindDate = date;
    }
    remindText = remindText.replace(/^-\s*/, "").trim();
  }
  if (remindDate) {
    if (result.sms) {
      var smsText = result.sms;
      var minutes = Number(smsText.match(/(\d+)/g)[0]);
      if (minutes) {
        var newDate = new Date(remindDate.getTime() - 60000 * minutes);
        if (newDate > new Date()) {
          remindDate = newDate;
        }
      }
    }    
    sheet.setActiveSelection('B' + lastRow).setValue(remindDate);
    sheet.setActiveSelection('C' + lastRow).setValue(remindText);
    sheet.setActiveSelection('D' + lastRow).setValue(result.title);     
    var template = HtmlService.createTemplateFromFile('Answer').getRawContent();
    var message = template.replace(/%id/g, (lastRow-1)).replace(/%message/g, remindText).replace(/%date/g, Utilities.formatDate(remindDate, ss.getSheetByName("settings").getRange("TIME_ZONE").getValue(), 'dd/MM/yyyy HH:mm'));
    sendText(message, chatId);
    ss.getSheetByName("settings").setActiveSelection('TEXT').setValue('');
    ss.getSheetByName("settings").setActiveSelection('DATE').setValue('');
  } else {
    sendText(HtmlService.createTemplateFromFile('When').getRawContent().replace(/%message/g, remindText), chatId);
    ss.getSheetByName("settings").setActiveSelection('TEXT').setValue(remindText);
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
  var message = template.replace(/%id/g, id).replace(/%message/g, sheet.getRange('C' + row).getValue()).replace(/%date/g, Utilities.formatDate(curDate, ss.getSheetByName("settings").getRange("TIME_ZONE").getValue(), 'dd/MM/yyyy HH:mm'));
  
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
  var message = template.replace(/%id/g, id).replace(/%message/g, sheet.getRange('C' + row).getValue()).replace(/%date/g, Utilities.formatDate(date, ss.getSheetByName("settings").getRange("TIME_ZONE").getValue(), 'dd/MM/yyyy HH:mm'));
  
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
  var message = template.replace(/%id/g, id).replace(/%message/g, sheet.getRange('C' + row).getValue()).replace(/%date/g, Utilities.formatDate(sheet.getRange('A' + row).getValue(), ss.getSheetByName("settings").getRange("TIME_ZONE").getValue(), 'dd/MM/yyyy HH:mm'));
  
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
      var message = template.replace(/%id/g, id).replace(/%message/g, text).replace(/%date/g, Utilities.formatDate(nextDate, ss.getSheetByName("settings").getRange("TIME_ZONE").getValue(), 'dd/MM/yyyy HH:mm'));
      
      var deleteButton = {
        text: 'Delete',
        callback_data: "/delete " + id
      };
      var keyboard = {};
      keyboard.inline_keyboard = [];
      keyboard.inline_keyboard.push([deleteButton]);
      
      sendText(message, chatId, JSON.stringify(keyboard));
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
  //console.log({message: 'remind', parameters: lastRow});
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
        var keyboard = {};
        keyboard.inline_keyboard = [];
        keyboard.inline_keyboard.push([quarterButton, oneButton, twoButton]);
        keyboard.inline_keyboard.push([dayButton, weekButton, monthButton, yearButton]);

        sendText(message, SpreadsheetApp.getActiveSpreadsheet().getSheetByName("settings").getRange("CHAT_ID").getValue(), JSON.stringify(keyboard));
        sheet.setActiveSelection('A' + i).setValue(new Date());
      } 
    }
  }
}

function sendText(text, chatId, replyMarkup) {
    var payload = {
      'method': 'sendMessage',
      'chat_id': String(chatId),
      'text': text,
      'parse_mode': 'Markdown',
      'reply_markup': replyMarkup
    }    
    var data = {
      "method": "post",
      "payload": payload
    }    
    UrlFetchApp.fetch('https://api.telegram.org/bot' + SpreadsheetApp.getActiveSpreadsheet().getSheetByName("settings").getRange("API_TOKEN").getValue() + '/', data);
}

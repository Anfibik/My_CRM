// g:\Programming\My_python_project\My_CRM\frontend\src\utils\utils.js

export const formatPhoneNumberUA = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      // Возвращаем как есть, если не строка или пусто/null
      return phoneNumber;
    }
  
    // Удаляем распространенные символы форматирования (пробелы, скобки, дефисы),
    // оставляя только цифры и возможный начальный '+'.
    // Это помогает стандартизировать номер перед проверкой его структуры.
    const cleanedForCheck = phoneNumber.replace(/[^+\d]/g, '');
  
    // Проверяем, начинается ли очищенный для проверки номер с '+380'
    // и имеет ли он корректную общую длину для украинского мобильного номера
    // (+380 и следующие 9 цифр = 13 символов).
    // Regex /^\+380\d{9}$/ дополнительно гарантирует, что после +380 идут только цифры.
    if (cleanedForCheck.startsWith('+380') && cleanedForCheck.length === 13 && /^\+380\d{9}$/.test(cleanedForCheck)) {
      const operatorCode = cleanedForCheck.substring(3, 6); // Извлекает код оператора (например, "050")
      const firstPart = cleanedForCheck.substring(6, 9);    // Извлекает следующие 3 цифры
      const secondPart = cleanedForCheck.substring(9, 11);   // Извлекает следующие 2 цифры
      const thirdPart = cleanedForCheck.substring(11, 13);  // Извлекает последние 2 цифры
  
      return `+38 (${operatorCode}) ${firstPart}-${secondPart}-${thirdPart}`;
    }
  
    // Если номер не соответствует критериям украинского формата,
    // возвращаем исходную строку phoneNumber, чтобы не терять
    // возможное пользовательское форматирование, если оно не подпало под шаблон.
    return phoneNumber;
  };
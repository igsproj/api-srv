Пример маленького и быстрого сервера в стиле "rest api". 
Под капотом используется модули node:http или node-fastcgi (требуется установка из npm). 
Лучший вариант применения, это использовать за web сервером типа nginx в качестве :

1) обратного прокси для http
2) как fcgi приложение

fcgi вариант будет работать быстрее, особенно в сочетании с unix domains (что очень рекомендуется!)
Файл app.js содержит пример, в котором реализованы методы POST, PUT, DELETE, OPTIONS, GET, а также CORS заголовки. 
Сервер будет записывать в свой массив данные из POST / PUT. Для правильной работы, требуется поле id, которое должно формироваться на клиенте.


This is a small polyfill that I created to replicate the functionality declared in
[http://www.w3.org/TR/2011/WD-eventsource-20110310/](http://www.w3.org/TR/2011/WD-eventsource-20110310/).

Usage is as follows:

```javascript
var source = new EventSource("updates.cgi");
source.onmessage = function(ev){
	alert(ev.message + ": " + ev.data);
};
source.onerror = function(){
	alert("Oh no, an error occurred.");
};
source.onopen = function(){
	alert("Connection opened!");
};
```

I've also added addEventListener syntax in.

```javascript
var source = new EventSource("updates.cgi");
source.addEventListener("message", function(ev){
	alert(ev.message + ": " + ev.data);
});
source.addEventListener("error", function(){
	alert("Oh no, an error occurred.");
});
source.addEventListnere("open", function(){
	alert("Connection opened!");
});
```

Please note that this is **untested** at the moment.  I need to test it in all
browsers, IE6 and up.

if(!window.EventSource){
	function EventSource(url){
		this.url = url;
		
		this.CONNECTING = 0;
		this.OPEN = 1;
		this.CLOSED = 2;
		
		this.readyState = this.CONNECTING;
		
		this.onopen = function(){};
		this.onmessage = function(){};
		this.onerror = function(){};
		
		this.addEventListener = function(ev, callback){
			switch(ev){
				case "open":
				case "message":
				case "error":
					var current = this["on" + ev];
					
					this["on" + ev] = function(){
						current();
						callback();
					};
					break;
				
				default:
					throw ev + " is not a valid event for this object.";
			}
		};
		
		var _req = false,
			_lastEventID = "",  //Per spec.  The initial request's Last-Event-ID header must be the empty string.
			
			_buildXHR = function(){
				try{
					_req = new XMLHttpRequest();
				}catch(e){
					var pids = ["Msxml2.DOMDocument.6.0", "Msxml2.DOMDocument.3.0", "Microsoft.XMLHTTP"];  //We can only hope that we can obtain one of the first two, as they are guaranteed to have the abort() method implemented (I'm not sure about the last, I think that that kind of says "use the latest one available."  Clarity would be appreciated)
					
					for(var i = 0, j = pids.length; i < j; i++){
						try{
							_req = new ActiveXObject(pids[i]);
						}catch(e){
						}
					}
					
					if(!_req){
						throw "No XMLHttpRequest handler available.";
						return false;
					}
				}
				
				return true;
			},
			
			_fail = function(){
				this.readyState = this.CLOSED;
				
				setTimeout(this.error, 1);
			},
			
			_nlRegex = /\r\n|\n|\r/,
			_bomRegex = /^\uFEFF/,
			_numRegex = /^[0-9]+$/,
			_enlRegex = /\n$/,
			_ssRegex = /^ /,
			
			_dispatchEvent = function(ev){
				if(ev.data === ""){
					return false;
				}
				
				ev.origin = url;
				ev.data = ev.data.replace(_enlRegex, "");
				
				setTimeout(function(){
					this.onmessage(ev);
				}, 1);  //Asynchronously fire the onmessage function with the ev argument.
				
				return true;
			},
			
			_retry = 0,
			
			_broadcastConnection = function(){
				this.readyState = this.OPEN;
				
				setTimeout(this.onopen, 1);  //Asynchronously fire the onopen function.
			},
			
			_process = function(){
				if(!_buildXHR()){
					return false;
				}
				
				_req.open("GET", url, true);
				_req.setRequestHeader("Cache-Control", "no-cache");  //Per spec.  This will bypass any server-side caching being used.
				_req.setRequestHeader("Last-Event-ID", _lastEventID);
				_req.send();
				_req.onreadystatechange = function(){
					if(_req.readyState === 4){
						if(_req.status === 200){
							_broadcastConnection();
							
							if(_req.getResponseHeader("Content-Type") !== "text/event-stream"){
								_fail();
								
								return;
							}
							
							var lines = _req.responseText.replace(_bomRegex, "").split(_nlRegex),
								ev = new MessageEvent(),
								field,
								value;
							
							for(var i = 0, j = lines.length; i < j; i++){
								if(lines[i] === ""){
									_dispatchEvent(ev);
									
									ev = new MessageEvent();
									
									continue;
								}
								
								if(lines[i].indexOf(":") === 0){
									continue;
								}
								
								if(lines[i].indexOf(":") > 0){
									field = lines[i].substr(0, lines[i].indexOf(":"));  //Per spec.  All data before the furst occurence of : will be considered the field name
									value = lines[i].substr(lines[i].indexOf(":") + 1).replace(_ssRegex, "");  //Per spec.  All data after the first occurence of :, minus only one leading space (if present), will be considered the field value
								}else{
									field = lines[i];
									value = "";
								}
									
								switch(field){
									case "event":
										ev.message = value;
										continue;
									
									case "data":
										ev.data += value + "\n";
										continue;
									
									case "id":
										ev.lastEventId = value;
										_lastEventID = value;
										continue;
									
									case "retry":
										if(!_numRegex.match(value)){
											continue;
										}
										
										_retry = parseInt(value);
										continue;
									
									default:
										continue;
								}
							}
							
							_dispatchEvent(ev);
							
							if(_retry > 0){
								setTimeout(_process, _retry);
							}
						}else{
							_fail();
						}
					}
				}
			};
		
		this.close = function(){
			if(!_req){
				return true;
			}
			
			if(_req.abort){
				_req.abort();
			}else{
				_req.onreadystatechange = function(){};
			}
			
			this.readyState = this.CLOSED;
			
			return true;
		};
		
		setTimeout(_process, 1);  //Process everything asynchronously, as they'll need to set the event handlers after they've instantiated the object.
	}
	
	if(!window.MessageEvent){
		function MessageEvent(){
			return {
				message : "",
				data : "",
				origin : "",
				lastEventId : ""
			}
		}
	}
}
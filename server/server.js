var packageVersion = require('./../package.json').version;
console.log("packageVersion :: " + packageVersion);

var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

var twitterHandle = "@ibmretail";

function escapeRegExp(str) 
{
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) 
{
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

//Application info of the node js mobile boilerplate, available under 'Mobile Options' on the Bluemix dashboard for the application
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
console.log('appInfo = ' + JSON.stringify(appInfo));

//Application GUID of the node js mobile boilerplate, available under 'Mobile Options' on the Bluemix dashboard for the application
var appGUID = appInfo['application_id'];
console.log('appGUID = ' + appGUID);

//Application URI/Route - specific to Bluemix Region
var appURI = appInfo['application_uris'][0];
console.log('appURI = ' + appURI);

//Set PUSH service URL according to Bluemix Region
var pushURL = "https://mobile.ng.bluemix.net/imfpush/v1/apps/";
if (appURI.indexOf("eu-gb") >= 0)
{
	pushURL = "https://mobile.eu-gb.bluemix.net/imfpush/v1/apps/";
}
else if (appURI.indexOf("au-syd") >= 0)
{
	pushURL = "https://mobile.au-syd.bluemix.net/imfpush/v1/apps/";
}
else
{
	pushURL = "https://mobile.ng.bluemix.net/imfpush/v1/apps/";
}
console.log("pushURL  = " + pushURL);

var pushClientSecret = "32704b4d-3de4-47dc-bdd6-f0d8c9d2aa01";
appInfo["pushClientSecret"] = pushClientSecret;

var pushAppGuid = appGUID;

//VCAP_SERVICES = Environment variable that contains information of each service instance bounded to the application, available under 'Environment Variables' on the Bluemix dashboard for the application, on the left hand side tab/navigation panel
//Information comprises of service instance name, credentials and connection URL to the service instance
var appServices = JSON.parse(process.env.VCAP_SERVICES  || "{}");
console.log('appServices = ' + JSON.stringify(appServices));

//Request - node js package to make http calls
var request = require('request');

var ibmdb = require('ibm_db');

var db2;
var db2ConnString;
var db2HasConnect = false;

function checkdb2Connection()
{
	console.log("Function :: checkdb2Connection");
	if (appServices['dashDB'])
	{
		db2HasConnect = true;
		db2 = appServices['dashDB'][0].credentials;
		db2ConnString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;
		console.log("db2ConnString",db2ConnString);
	}
	else
	{
		console.log("No db2ConnString set");
	}
}

function listSysTables(res,line)
{
	console.log("Function :: listSysTables");
	var foundRows = false;
	var ROWS;
	if (db2ConnString)
		console.log('db2ConnString',db2ConnString);
	else
		checkdb2Connection();
	
	ibmdb.open(db2ConnString, function (err, connection) {
	    if (err) 
	    {
	      console.log(err);
	      return;
	    }
	    //select * from DASH105558.MBA_BLUEMIX_PURCHASE_CHART FETCH FIRST 10 ROWS ONLY
	    //select * from DASH105558.MBA_BLUEMIX_PURCHASE_CHART LIMIT 10
	    //lineCategory = 'Watches and Flats'
	    var lineCategory = line ? line : "Wallets and Wristlets";
	    console.log("Selecting/finding rows for lineCategory");
	    connection.query("select * from DASH105558.MBA_BLUEMIX_PURCHASE_CHART where ANTECEDENT='"+lineCategory+"' order by CONFIDENCE__ desc FETCH FIRST 10 ROWS ONLY", function (err1, rows) {
		      if (err1) 
		      {
		      	console.log("ERROR IN SELECT");
		      	console.log(err1);
		      	sendXhrResponse(res,{'error':err1});
		      }
		      else 
		      {
		      		console.log("Rows are as follows");
		      		console.log(rows);
		      		foundRows = true;
		      		ROWS = rows;
		      		sendXhrResponse(res,ReplyCreator.dashdbresult(rows));
		      }
		      
		      connection.close(function(err2) 
		      {
		      		console.log("DB2 Connection Closed");
		        	if(err2) 
		        		console.log(err2);
		      });
		      
	
		    });
	});
}

//helper function for sending back XHR responses
//function helps with issue of forgetting to set the CORS cross origin header
//and also assists in JSON stringification management
function sendXhrResponse(xhrResponseObject, message, optionalStringifyFlag)
{
	//default stringify -> true, unless function call specifies otherwise
	stringify = optionalStringifyFlag || true;
	
	//overcome CORS cross-origin access issue by allowing all origins:
	xhrResponseObject.setHeader("Access-Control-Allow-Origin", "*");
	
	//handle JSON stringification
	if(stringify)
	{
		message = JSON.stringify(message);
	}
	
	//send it away!
	xhrResponseObject.send(message);
}

//Reply Creator: helper function for sending structured reply/response to the iPad application
var ReplyCreator = new function()
{
	this.checkconnection = function(returnData){
	
		var msg = "Able to connect";
		var returnObject = {
			status: "checkconnection",
			message: msg,
			data:returnData
		};
		
		return returnObject;
	};
	
	this.addedservice = function(returnData, pushDeviceId){
	
		var msg = "Added these services";
		var returnObject = {
			status: "addedservice",
			pushDeviceId: pushDeviceId,
			message: msg,
			data: returnData
		};
		
		return returnObject;
	};
	
	this.notifyproductid = function(returnData){
		
		var msg = "Wait for notification";
		var returnObject = {
			status: "notifyproductid",
			data: returnData,
			message: msg
		};
		
		return returnObject;
	};
	
	this.removedevice = function(returnData){
		var msg = "Remove device";
		var returnObject = {
			status: "removedevice",
			data: returnData,
			message: msg
		};
		
		return returnObject;
	};
	
	this.getAppInfo = function(returnData){
		var msg = "App Info";
		var returnObject = {
			status: "appinfo",
			data: returnData,
			message: msg
		};
		
		return returnObject;
	};
	
	this.getAppServices = function(returnData){
		var msg = "App Services";
		var returnObject = {
			status: "appservices",
			data: returnData,
			message: msg
		};
		
		return returnObject;
	};
	
	this.twitterresult = function(returnData){		
		var msg = "Twitter Result";
		var returnObject = {
			status: "twitterresult",
			data: returnData,
			message: msg
		};
		
		return returnObject;
	};
	
	this.weatherresult = function(returnData){		
		var msg = "Weather Company Data Result";
		var returnObject = {
			status: "weatherresult",
			data: returnData,
			message: msg
		};
		
		return returnObject;
	};
	
	this.dashdbresult = function(returnData){
		var msg = "Predictive Analytics DashDB Result";
		var returnObject = {
			status: "dashdbresult",
			data: returnData,
			message: msg
		};
		
		return returnObject;
	};
	
};

//Helper function to handle activation of each service
//Service is activated from the iPad application
//On activation, a http request is made from the iPad application, passing data such as type of service and device ID of the iPad
var handleServiceActivation = function(req){
	console.log("Function :: handleServiceActivation");
	
	//Extract type service and device ID from the request parameter object
	var service = req.params.service;
	var pushDeviceId = req.params.pushDeviceId;
		
	console.log('pushDeviceId  - ' + pushDeviceId);
		
	var data = {};
	
	//Switch/case statement to handle service types
	switch(service) {
		
		case "imfpush":
					console.log('Activating imfpush');
					
					//Check for PUSH service credentials in VCAP_SERVICES(appServices)
					var push_credentials = appServices["imfpush"] ? appServices["imfpush"][0].credentials : "unavailable";
					
					console.log('push_credentials: %s', JSON.stringify(push_credentials));
					
					data["imfpush"] = push_credentials;
					
					if (push_credentials["appGuid"]){
						console.log("Setting PUSH APP GUID");
						pushAppGuid = push_credentials["appGuid"];
					}
					else {
						console.log("Using application id as PUSH APP GUID");
						data["imfpush"]["appGuid"] = pushAppGuid;
					}
					
					
					if (data["imfpush"] != "unavailable")
					{
						//PUSH credentials are available
						data["imfpush"]["clientSecret"] = pushClientSecret;
						
						console.log("data impfpush = ",data["imfpush"]);
						
						//Change PUSH operation mode to PRODUCTION
						changeAppPushSettings("PRODUCTION");
						
						if (pushDeviceId != 'nodevice')
						{
							//Check if the device ID is a KNOWN deviceID
							var checkDeviceExists = getPushDevice(pushDeviceId);
							
							if (checkDeviceExists)
							{
								console.log("Device - " + pushDeviceId + ' was found in list of known/registered deivces');
							}
							else
							{
								console.log("Device - " + pushDeviceId + ' NOT found');
								console.log("First Push - so send Welcome to new notification service alert");
								
								setTimeout(function(){
									console.log("timeout OVER");
									sendPushNotificationForService("imfpush","imfpush","Welcome to the IBM mobile notification service!",pushDeviceId);
									pushDevicesList.push(pushDeviceId);	
								}, 10000);
							}
						}
						else
						{							
							console.log("No specific pushDeviceId was sent...");							
						}
					}
					else
					{
						console.log("imfpush credentials are NOT available");
					}
					
					break;
			
						
		case "twitterinsights":
						console.log('Activating twitterinsights');
						
						//Check for INSIGHTS_FOR_TWITTER service credentials in VCAP_SERVICES(appServices)					
						var insight_host = appServices["twitterinsights"] ? appServices["twitterinsights"][0].credentials.url : "unavailable";
						
						console.log('twitterinsights: %s', insight_host);

						data["twitterinsights"] = insight_host;
						
						if (data["twitterinsights"] != "unavailable")
						{
							//INSIGHTS_FOR_TWITTER credentials are available	
						
							if (pushDeviceId != 'nodevice')
							{
								setTimeout(function(){
									console.log("timeout OVER");
									console.log('Send service activation notification...');
									sendPushNotificationForService("Insights for Twitter","imfpush","Thank you for activating Twitter Insights!", pushDeviceId);
								}, 5000);
							}
							else
							{
								console.log("No specific pushDeviceId was sent...");
							}
						}
						else
						{
							console.log("twitterinsights credentials are NOT available");
						}

						break;
						
		case "weatherinsights":
						console.log('Activating weatherinsights');
						var weather_host = appServices["weatherinsights"] ? appServices["weatherinsights"][0].credentials.url : "unavailable";
						console.log('weather_host: %s', weather_host);	
						
						data["weatherinsights"] = weather_host;
						
						if (data["weatherinsights"] != "unavailable")
						{
							//INSIGHTS_FOR_TWITTER credentials are available	
						
							if (pushDeviceId != 'nodevice')
							{
								setTimeout(function(){
									console.log("timeout OVER");
									console.log('Send service activation notification...');
									sendPushNotificationForService("Weather Company Data","imfpush","Thank you for activating Weather Company Data!", pushDeviceId);
								}, 5000);
							}
							else
							{
								console.log("No specific pushDeviceId was sent...");
							}
						}
						else
						{
							console.log("weatherinsights credentials are NOT available");
						}
						
						break;
						
		case "pm-20":
						console.log('Activating Predictive Analytics');
						var pm_host = appServices["pm-20"] ? appServices["pm-20"][0].credentials.url : "unavailable";
						console.log('pm_host: %s', pm_host);
						data["pm-20"] = pm_host;
						
						if (data["pm-20"] != "unavailable")
						{
							//Predictive Analytics credentials are available	
							
							checkdb2Connection();
						
							if (pushDeviceId != 'nodevice')
							{
								setTimeout(function(){
									console.log("timeout OVER");
									console.log('Send service activation notification...');
									sendPushNotificationForService("Predictive Analytics","imfpush","Thank you for activating Predictive Analytics!", pushDeviceId);
								}, 5000);
							}
							else
							{
								console.log("No specific pushDeviceId was sent...");
							}
						}
						else
						{
							console.log("Predictive Analytics pm-20 credentials are NOT available");
						}
						
						break;
		
						
		case "watson_vision_combined":
						console.log('Activating watson_vision_combined');
						
						//Check for ALCHEMY_API service credentials in VCAP_SERVICES(appServices)
						
						//var	alchemy_vision = appServices["alchemy_api"] ? appServices["alchemy_api"][0].credentials.apikey : "unavailable";
						var	watson_vision_combined = appServices["watson_vision_combined"] ? appServices["watson_vision_combined"][0].credentials : "unavailable";
						
						data["watson_vision_combined"]= watson_vision_combined;
						console.log('watson_vision_combined = ', JSON.stringify(watson_vision_combined));					
						
						if (watson_vision_combined != "unavailable")
						{
							//ALCHEMY_API credentials are available	
							data["watson_vision_combined"]['endpoint'] = 'v3/classify';
							data["watson_vision_combined"]['versionDate'] = '2016-05-20';
							console.log('data["watson_vision_combined"] = ', JSON.stringify(data["watson_vision_combined"]));
							if (pushDeviceId != 'nodevice')
							{
								setTimeout(function(){
									console.log("timeout OVER");
									console.log('Send service activation notification...');
									sendPushNotificationForService("Watson Visual Recognition","imfpush","Thank you for activating Watson Visual Recognition!", pushDeviceId);
								}, 5000);
							}
							else
							{
								console.log("No specific pushDeviceId was sent...");
							}
						}
						else
						{
							console.log("watson_vision_combined credentials are NOT available");
						}						
						
						break;					
	
		default:
				data["default"] = "No Service Match";
				console.log('No Service Match...running default');
	}
	
	return data;
};

//...............PUSH service helper functions....................

//Array containing deviceIDs of each iPad application using this node.js mobile boilerplate as a back-end server
var pushDevicesList = [];

//Change application settings for PUSH
//Change operation mode of the application to = SANDBOX | PRODUCTION

var changeAppPushSettings = function(mode){
	console.log("Function :: changeAppPushSettings");
	
	//PUT request body
	var putBody = {"mode":mode};
	putBody = JSON.stringify(putBody);
	
	//Get PUSH Credentials for this mobile boilerplate
	var pushCredentials = appServices["imfpush"][0].credentials;
	
	//APP_SECRET for this mobile boilerplate
	//Must be part of the HTTP POST header
	var appSecret = pushCredentials.appSecret;
	
	//Contents of the PUT REST call includes call 
	//..1..type/method which is PUT
	//..2..URL to make the request against
	//..3..HEADERS which comprises of the application secret and response content-type, which is set to JSON, and
	//..4..finally the body of the request which specifies mode of operation
	var putOptions = {
			method: "PUT",
			//url:pushURL+appGUID+"/settings",
			url:pushURL+pushAppGuid+"/settings",
			headers:{
				"Content-Type":"application/json",
				"appSecret":appSecret
			},
			body:putBody
	};
	
	//Using node.js request module to make the PUT REST call
	//Updates an existing application settings. Change the operation mode of the application
	request(putOptions, function(error, response, body){
		if (error)
		{
			console.log("ERROR code - " + error.code);
			console.log("ERROR message - " + error.message);
		}
		else
		{
			if (response.statusCode >= 200 && response.statusCode < 400)
			{
				console.log("RESPONSE SUCCESS");
				console.log("Response statusCode - " + response.statusCode);
				console.log("Response body - " + body);
			}
			else
			{
				console.log("Response statusCode - " + response.statusCode);
			}
		}
	});
};

//Retrieve a deviceID from list of available/registered iPad(device) applications deviceIDs
var getPushDevice = function(deviceId){
	console.log("Function :: getPushDevice");
	console.log("Is the device = '" + deviceId + "' already registered?");
	var foundDevice = false;
	for (var i=0; i<pushDevicesList.length; i++)
	{
		if (pushDevicesList[i] == deviceId)
		{
			console.log("Found device");
			foundDevice = true;
			break;
		}
	}
	return foundDevice;
};

//Remove a specific deviceID from the available/registered deviceIDs
var removeDevice = function(deviceId){
	console.log("Function :: removeDevice");
	var index = pushDevicesList.indexOf(deviceId);
	if (index > -1)
	{
		console.log("Index of pushDeviceId - " + index);
		pushDevicesList.splice(index, 1);
		return true;
	}
	else
	{
		console.log("pushDeviceId not found");
		return false;
	}
};

//Send PUSH Message/Notification on activation of each service type
var sendPushNotificationForService = function(service, serviceType, alertMessage, pushdeviceId){
	console.log("Function :: sendPushNotificationForService - for service - " + service  + " , for device - " + pushdeviceId);
	
	//Text accessible from within body of the notification payload
	var payloadContent = service + " Service Activated"; 
	
	var messageForService = {
		//An alert message to display to the user
		//String/text describing purpose of the notification, iOS displays a standard alert or a banner with this text, based on the user's setting
		alert : alertMessage
	};
	
	var target = {
		//List of specified devices intended to receive this notification message
		//In this case only one device, the iPad application/device that activated a specific Bleumix service type
		deviceIds : [pushdeviceId]
	};
	
	//Settings specific to mobile platforms = gcm : Android & apns : iOS
	//Each platform can be targeted with a payload = Custom JSON payload that will part of the notification message, contains user-defined key/value pairs
	var settingsForService = {
		gcm : {
				//Custom Payload delivered to Android devices
				payload : { message :  "Hello to Android devices" }
		},
		apns : {
				//Custom Payload delivered to iOS devices
				payload : { servicetype : serviceType,
							content : payloadContent
						}
		}
	};
	
	//PUSH notifications can be sent using 3 methods: using Mobile PUSH SDK, from the PUSH Bluemix Dashboard and via PUSH Service REST API	
	//In this case, we are using the REST API approach
	
	//For sending PUSH notification using REST APIs, a HTTP POST request must be made to the Bluemix PUSH service
	
	//POST request body
	var pushBody = {"message":messageForService,
					"target":target,
					"settings":settingsForService
	};
	pushBody = JSON.stringify(pushBody);
	
	//Get PUSH Credentials for this mobile boilerplate
	var pushCredentials = appServices["imfpush"][0].credentials;
	
	//APP_SECRET for this mobile boilerplate
	//Must be part of the HTTP POST header
	var appSecret = pushCredentials.appSecret;
	
	//Contents of the POST REST call includes call 
	//..1..type/method which is POST
	//..2..URL to make the request against
	//..3..HEADERS which comprises of the application secret and response content-type which is set to JSON, and
	//..4..finally the body of the request which includes notification content received by the iPad application
	var postOptions = {
			method: "POST",
			//url:pushURL+appGUID+"/messages",
			url:pushURL+pushAppGuid+"/messages",
			headers:{
				"Content-Type":"application/json",
				"appSecret":appSecret
			},
			body:pushBody
	};
	
	//Using node.js request module to make the POST REST call
	//When the request to send the message is accepted, sends push notifications to the specified targets and returns HTTP return code 202.
	request(postOptions, function(error, response, body){
		if (error)
		{
			console.log("ERROR code - " + error.code);
			console.log("ERROR message - " + error.message);
		}
		else
		{
			if (response.statusCode >= 200 && response.statusCode < 400)
			{
				console.log("RESPONSE SUCCESS");
				console.log("Response statusCode - " + response.statusCode);
				console.log("Response body - " + body);
			}
			else
			{
				console.log("Response statusCode - " + response.statusCode);
			}
		}
	});
};

//Send PUSH Message/Notification containing a specific PRODUCT_ID & PRODUCT_NAME
var sendPushNotificationForProduct = function(alertMessage, productId, productName, pushdeviceId){
	console.log("Function :: sendPushNotificationForProduct - productId - " + productId  + " , productName - " + productName +" , for pushdeviceId - " + pushdeviceId);
	
	//var alertMessage = "Your '"+ productName +"' is ready for pick up at your nearest IBM Retail store.";
	
	var messageForService = {
		alert : alertMessage
	}
	
	var target = {
		deviceIds : [pushdeviceId]
	};
	//Custom payload is passed on the options parameter
	var settingsForService = {
		gcm : {
				//Custom Payload to deliver to Android devices
				payload : { message :  "Hello to Android devices" }
		},
		apns : {
				//Custom Payload to deliver to iOS devices
				payload : { productId : productId,
							productName : productName
						}
		}
	}
	
	var pushBody = {"message":messageForService,
					"target":target,
					"settings":settingsForService
	};
	pushBody = JSON.stringify(pushBody);
	
	var postOptions = {
			method: "POST",
			//url:pushURL+appGUID+"/messages",
			url:pushURL+pushAppGuid+"/messages",
			headers:{
				"Content-Type":"application/json",
				"appSecret":appSecret
			},
			body:pushBody
	};
	
	request(postOptions, function(error, response, body){
		if (error)
		{
			console.log("ERROR code - " + error.code);
			console.log("ERROR message - " + error.message);
		}
		else
		{
			if (response.statusCode >= 200 && response.statusCode < 400)
			{
				console.log("RESPONSE SUCCESS");
				console.log("Response statusCode - " + response.statusCode);
				console.log("Response body - " + body);
			}
			else
			{
				console.log("Response statusCode - " + response.statusCode);
			}
		}
	});
};

//................INSIGHTS FOR TWITTER service helper functions..............
var MAX_TWEETS = 20;

//Function to send query to the twitter service and responds with output as data
function insightRequest(path, query, done) { 
	console.log("Function :: insightRequest, path - " + path + ", query - " + query);
	var insight_host = appServices["twitterinsights"][0].credentials.url;
	
	//Using node.js request module to make the GET REST call to Insights for Twitter service
	//Twitter Service URL is obtained from VCAP_SERVICES 
	//This REST call returns the number of Tweets found for a given query
    request({
        method: "GET",
        url: insight_host + '/api/v1/messages' + path,
        qs: {
            q: query,
            size: MAX_TWEETS
        }
    }, function(err, response, data) {
        if (err) {
            done(err);
        } else {
            if (response.statusCode == 200) {
                try {
                    done(null, JSON.parse(data));
                } catch(e) {
                    done({ 
                        error: { 
                            description: e.message
                        },
                        status_code: response.statusCode
                    });
                }
            } else {
                done({ 
                    error: { 
                        description: data 
                    },
                    status_code: response.statusCode
                });
            }
        }
    });
}

//................WEATHER COMPANY DATA service helper functions..............
function weatherAPI(path, qs, done) {
	console.log("Function :: weatherAPI");
	var weather_host = appServices["weatherinsights"][0].credentials.url;
    var url = weather_host + path;
    console.log(url, qs);
    request({
        url: url,
        method: "GET",
        headers: {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        },
        qs: qs
    }, function(err, req, data) {
        if (err) {
        	console.log("err",err);
        } else {
            if (req.statusCode >= 200 && req.statusCode < 400) {
                try {
                	//done({ message: "error", data: err });
                	console.log("INSIDE TRY", data);
                    done(null, JSON.parse(data));
                    
                } catch(e) {
                    console.log("catch",e);
                    done(e);
                }
            } else {
                console.log("ERROR", err);
                done(null, JSON.parse(data));
            }
        }
    });
}


//GET request to check whether the iPad can connect to the back-end server mobile boilerplate
app.get('/checkconnection/', function(req, res){
	console.log("GET call - checkconnection");
	
	//Reply with application GUID of the mobile boilerplate
	sendXhrResponse(res, ReplyCreator.checkconnection(appGUID));
});

//GET request to retrieve back-end server application's information
app.get('/appinfo/', function(req, res){
	console.log("GET call - appinfo");
	
	//Reply with application info
	sendXhrResponse(res, ReplyCreator.getAppInfo(appInfo));
});

//GET request to retrieve information on all the service bounded to the mobile boilerplate
app.get('/appservices/', function(req, res){
	console.log("GET call - appservices");
	
	//Reply with VCAP_SERVICES info
	sendXhrResponse(res, ReplyCreator.getAppServices(appServices));
});

//GET request to activate a specific service, activated from the 'Settings' page in the iPad application
app.get('/activateservice/:service/:pushDeviceId/', function(req, res){
	
	var service = req.params.service;
	console.log('GET call - activateservice , for - ' + service);
	var pushDeviceId = req.params.pushDeviceId;
	
	//Call handleServiceActivation helper function to generate specific response data to be sent back to the iPad application
	var returnData = handleServiceActivation(req);
	
	//ReplyCreator formats the response data in a structure expected by the iPad application
	sendXhrResponse(res, ReplyCreator.addedservice(returnData, pushDeviceId));
});

//GET request to remove/de-register a particular deviceID/iPad from the list of known devices
//This request is made when PUSH service is deactivated from the 'Settings' page in the iPad application
app.get('/removedevice/:pushDeviceId/', function(req,res){
	var pushDeviceId = req.params.pushDeviceId;
	var checkDeviceExists = getPushDevice(pushDeviceId);
	var data = {};
	if (checkDeviceExists)
	{
		console.log("Device - " + pushDeviceId + ' was found in list of known/registered deivces');
		if (removeDevice(pushDeviceId))
		{
			console.log("Device removed successfully");
			data["pushDeviceId"] = pushDeviceId;
			data["message"] = "Device removed successfully";
		}
		else
		{
			console.log("Device removed successfully");
			data["pushDeviceId"] = pushDeviceId;
			data["message"] = "Device removal unsuccessful";
		}
		
	}
	else
	{
		console.log("Device - " + pushDeviceId + ' NOT found');
		data["pushDeviceId"] = pushDeviceId;
		data["message"] = "Device not found in the list";
	}
	
	//Make DELETE REST call to the PUSH service by passing the application GUID and the particular deviceID
	var deleteOptions = {
			method: "DELETE",
			//url:pushURL+appGUID+"/devices/"+pushDeviceId
			url:pushURL+pushAppGuid+"/devices/"+pushDeviceId
	};
	
	//Using node.js request module to make the DELETE REST call
	//Deletes device registrations for the given deviceID in the push service
	//When the device registration is successfully deleted, the call returns an HTTP response code 204 with no content
	request(deleteOptions, function(error, response, body){
		if (error)
		{
			console.log("ERROR code - " + error.code);
			console.log("ERROR message - " + error.message);
		}
		else
		{
			if (response.statusCode >= 200 && response.statusCode < 400)
			{
				console.log("RESPONSE SUCCESS");
				console.log("Response statusCode - " + response.statusCode);
				console.log("Response body - " + body);
			}
			else
			{
				console.log("Response statusCode - " + response.statusCode);
			}
		}
	});
	
	sendXhrResponse(res, ReplyCreator.removedevice(data));
});

//GET request call to notify a particular product 
app.get('/notifyproductid/:pushDeviceId/:productId/:productName', function(req, res){
	var pushDeviceId = req.params.pushDeviceId;
	var productId = req.params.productId;
	var productName = req.params.productName;
	console.log("GET call - notifyproductid, for pushDeviceId : " + pushDeviceId);
	
	var checkDeviceExists = getPushDevice(pushDeviceId);
	var data = {};
	data["productId"] = productId;
	data["productName"] = productName;
	
	if (checkDeviceExists)
	{
		console.log("Device - " + pushDeviceId + ' was found in list of known/registered deivces');
		data["pushDeviceId"] = pushDeviceId;
		sendXhrResponse(res, ReplyCreator.notifyproductid(data));	
	}
	else
	{
		console.log("Device - " + pushDeviceId + ' NOT found');
		data["pushDeviceId"] = "not-found";
		sendXhrResponse(res, ReplyCreator.notifyproductid(data));
	}
	
	setTimeout(function(){
		console.log("timeout OVER");
		console.log('Send productId notification...');
		var alertMessage = "Your '"+ productName +"' is ready for pick up at your nearest IBM Retail store.";
		sendPushNotificationForProduct(alertMessage, productId, productName, pushDeviceId);
	}, 5000);
	
});

//GET request made from the iPad application when "Social Analytics" service is activated from the 'Settings' page on the iPad application
app.get('/getTwitterInsights', function(req, res){
	console.log("GET request getTwitterInsights");
	var recommendation = 0;
	var query1 = "@kohls flats posted:2015-01-01,2016-09-01 - sentiment:positive";//'@kohls shoes posted:2015-01-01,2015-01-30 - sentiment:positive';
	var query2 = "@kohls clutch posted:2015-01-01,2016-09-01 - sentiment:positive";//'@kohls clothing posted:2015-01-01,2015-01-30 - sentiment:positive';
    var countQuery1 = 0;
    var countQuery2 = 0;
	
	//Insights for Twitter offers 4 API operations: 
	//..1..Search = Finds Tweets in the Decahose or filtered PowerTrack stream
	//..2..Count =  Returns the number of Tweets based on a given query
	//..3..Check = Determines whether a list of messages complies with Twitter policies and Twitter users, and 
	//..4..Tracks = Provides Entry Plan users an assortment of endpoints to manage PowerTrack filters
	
	//Using node.js request module to make the GET REST call
	//Call count operation to retrieve the number of Tweets found for query1
	insightRequest("/count", query1, function(err, data) {
        if (err) 
		{
            res.send(err).status(400);
        } 
		else 
		{
			countQuery1 = data.search.results;			
			
			//Call count operation to retrieve the number of Tweets found for query2
			insightRequest("/count", query2, function(err, data) {
				if (err) 
				{
					res.send(err).status(400);
				} 
				else 
				{

					countQuery2 = data.search.results;
					
					//Determine which count was greater and the result is the recommended product, either 'shoes' or 'clothing'
					if(countQuery1 < countQuery2)
						recommendation = 2;
					else
						recommendation = 1;

					/*
						res.json({
							query: req.param("q"),
							SubmittedQuery1: query1,
							count1: 'shoes count is ' + countQuery1,
							SubmittedQuery2: query2,
							count2: 'clothing count is ' + countQuery2, 
							Recommendation: 'Recommendation is ' + recommendation			
						});
					*/
					
					query1 = replaceAll(query1, "@kohls", twitterHandle);
					query2 = replaceAll(query2, "@kohls", twitterHandle);
					
					var data = {
						'query1':{
							'query':query1,
							'count':countQuery1,
							'tags':['shoes']
						},
						'query2':{
							'query':query2,
							'count':countQuery2,
							'tags':['clothing']
						},
						'recommendation':recommendation
					};
					
					sendXhrResponse(res, ReplyCreator.twitterresult(data));
				}
			});			
		}
	});	
});

//app.get('/getWeatherData/:latitude?/:longitude?'
app.get('/getWeatherData/:zipcode?', function(req, res) {
    //var geocode = (req.query.geocode || "33.40,-83.42").split(",");
   	//var latitude = req.params.latitude || "32.96";
   	//var longitude = req.params.longitude || "-96.99";
   	
   	var zipcode = req.params.zipcode || "10001";
   	var locationId = zipcode + ":4:US";
   	
   	//Using Zipcode
    //api/weather/v1/location/10001:4:US/forecast/hourly/48hour.json
    //api/weather/v1/geocode/32.9427460/-96.9948380/forecast/hourly/48hour.json
    ///api/weather/v1/geocode/" + latitude + "/" + longitude + "/observations.json"
    
    weatherAPI("/api/weather/v1/location/" + locationId + "/observations.json", {
        units: "e",
        language: "en"
    }, function(err, result) {
        if (err) {
            //res.send(err).status(400);
            console.log("weather api callback IF");
			sendXhrResponse(res, ReplyCreator.weatherresult(err));
        } else {
        	console.log("weather api callback ELSE - 24 hours Forecast");
            //result.forecasts.length = 24;    // we require only 24 hours for UI
            //res.json(result);
            sendXhrResponse(res, ReplyCreator.weatherresult(result));
        }
    });
});

app.get('/getDevices', function(req,res){
	sendXhrResponse(res,pushDevicesList);
});

//checkdb2Connection
//listSysTables
app.get('/db2connection', function(req,res){
	checkdb2Connection();
	var rows = listSysTables(res);
	
});

app.get('/getConsequent/:line', function(req,res){
	//Leather Wristlets belongs to line 'Wallets and Wristlets'
	var line = req.params.line || "Wallets and Wristlets";
	listSysTables(res,line);
});



// ------------ Protecting backend APIs with Mo
	
//Mobile Client Access end -----------------

app.start = function () {
	// start the web server
	return app.listen(function () {
		app.emit('started');
		var baseUrl = app.get('url').replace(/\/$/, '');
		console.log('Web server listening at: %s', baseUrl);
		var componentExplorer = app.get('loopback-component-explorer');
		if (componentExplorer) {
			console.log('Browse your REST API at %s%s', baseUrl, componentExplorer.mountPath);
		}
	});
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
	if (err) throw err;
	if (require.main === module)
		app.start();
});


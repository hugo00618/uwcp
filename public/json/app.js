var LEVENSHTEIN_MATCH_RATIO = 0.1;

var express = require('express');
var app = express();
var natural = require('natural');
var nlp = require('compromise');
var sugar = require('sugar');
var db = require('./db.json');

var wpTokenizer = new natural.WordPunctTokenizer();
var tokenizer = new natural.WordTokenizer();

// var postTypeClassifier = new natural.BayesClassifier();
// postTypeClassifier.addDocument('driving', 'offer');
// postTypeClassifier.addDocument('looking for', 'request');
// postTypeClassifier.train();

// matching token : {placeCode, areaCode}
var places = {
    "bk": { "placeCode": "bk", "areaCode": "wat" },
    "downtown toronto": { "placeCode": "dt", "areaCode": "trt" },
    "downtown trt": { "placeCode": "dt", "areaCode": "trt" },
    "dt toronto": { "placeCode": "dt", "areaCode": "trt" },
    "dt trt": { "placeCode": "dt", "areaCode": "trt" },
    "toronto downtown": { "placeCode": "dt", "areaCode": "trt" },
    "trt downtown": { "placeCode": "dt", "areaCode": "trt" },
    "toronto dt": { "placeCode": "dt", "areaCode": "trt" },
    "trt dt": { "placeCode": "dt", "areaCode": "trt" },
    "finch": { "placeCode": "finch", "areaCode": "nyk" },
    "fairview": { "placeCode": "fvm", "areaCode": "nyk" },
    "gta": { "placeCode": "gta", "areaCode": "gta" },
    "loo": { "placeCode": "wat", "areaCode": "wat" },
    "markham": { "placeCode": "mar", "areaCode": "mar" },
    "mississauga": { "placeCode": "mis", "areaCode": "mis" },
    "north york": { "placeCode": "nyk", "areaCode": "nyk" },
    "pacific mall": { "placeCode": "pml", "areaCode": "mar" },
    "pmall": { "placeCode": "pml", "areaCode": "mar" },
    "pearson": { "placeCode": "yyz", "areaCode": "yyz" },
    "richmond hill": { "placeCode": "ric", "areaCode": "ric" },
    "rhill": { "placeCode": "ric", "areaCode": "ric" },
    "sauga": { "placeCode": "mis", "areaCode": "mis" },
    "scarborough": { "placeCode": "sca", "areaCode": "sca" },
    "scarborough town centre": { "placeCode": "stc", "areaCode": "sca" },
    "stc": { "placeCode": "stc", "areaCode": "sca" },
    "sheppard yonge": { "placeCode": "she", "areaCode": "nyk" },
    "sheppard / yonge": { "placeCode": "she", "areaCode": "nyk" },
    "sheppard and yonge": { "placeCode": "she", "areaCode": "nyk" },
    "yonge sheppard": { "placeCode": "she", "areaCode": "nyk" },
    "yonge / sheppard": { "placeCode": "she", "areaCode": "nyk" },
    "yonge and sheppard": { "placeCode": "she", "areaCode": "nyk" },
    "sq1": { "placeCode": "sq1", "areaCode": "mis" },
    "square one": { "placeCode": "sq1", "areaCode": "mis" },
    "toronto": { "placeCode": "trt", "areaCode": "trt" },
    "trt": { "placeCode": "trt", "areaCode": "trt" },
    "union": { "placeCode": "uni", "areaCode": "trt" },
    "university of waterloo": { "placeCode": "uw", "areaCode": "wat" },
    "uw": { "placeCode": "uw", "areaCode": "wat" },
    "uwaterloo": { "placeCode": "uw", "areaCode": "wat" },
    "vaughan": { "placeCode": "vgn", "areaCode": "vgn" },
    "waterloo": { "placeCode": "wat", "areaCode": "wat" },
    "yorkdale": { "placeCode": "ykd", "areaCode": "nyk" }
};

var defaultOrigins = ["uwaterloo"];

var placeComponents = {};
for (var key in places) {
    var myPlaceComponents = key.split(" ");
    if (myPlaceComponents.length > 1) {
        for (var i = 0; i < myPlaceComponents.length - 1; i++) {
            var myPlaceComponent = myPlaceComponents.slice(0, i + 1).join(" ");
            placeComponents[myPlaceComponent] = true;
        }
    }
}

var routePlaceLexicon = {};
for (var key in places) {
    routePlaceLexicon[key] = "RoutePlace";
}

// placeCode : level
var placeLvlDict = {
    "bk": 4,
    "dt": 3,
    "finch": 4,
    "fvm": 4,
    "gta": 1,
    "mar": 3,
    "mis": 3,
    "nyk": 3,
    "pml": 4,
    "ric": 3,
    "sca": 3,
    "she": 4,
    "sq1": 4,
    "stc": 4,
    "trt": 2,
    "uni": 4,
    "uw": 4,
    "vgn": 3,
    "wat": 3,
    "ykd": 4,
    "yyz": 4
};

// placeCode : user-friendly string
var placeNameDict = {
    "bk": "Burger King Plaza",
    "dt": "Downtown Toronto",
    "finch": "Finch Subway Station",
    "fvm": "Fairview Mall",
    "gta": "Greater Toronto Area",
    "mar": "Markham",
    "mis": "Mississauga",
    "nyk": "North York",
    "pml": "Pacific Mall",
    "ric": "Richmond Hill",
    "sca": "Scarborough",
    "she": "Sheppard Subway Station",
    "sq1": "Square One",
    "stc": "Scarborough Town Centre",
    "trt": "Toronto",
    "uni": "Union Station",
    "uw": "University of Waterloo",
    "vgn": "Vaughan",
    "wat": "Waterloo",
    "ykd": "Yorkdale",
    "yyz": "Pearson Airport"
};

var fbGeoInfoLexicon = {
    'Mississauga': "Place",
    'Ontario': "Place",
    'Waterloo': "Place"
};

var DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

var myDayOfWeekDict = {
    'mon': 'monday',
    'tue': 'tuesday',
    'wed': 'wednesday',
    'thu': 'thursday',
    'fri': 'friday',
    'sat': 'saturday',
    'sun': 'sunday',
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
    'sunday': 'sunday'
};

var myDayOfWeekLexicon = {};
for (var key in myDayOfWeekDict) {
    myDayOfWeekLexicon[key] = "MyDayOfWeek";
}

var dateRegExp = /(jan|feb|mar|apr|may|jun|jul|aug|sept|oct|nov|dec|january|febuary|march|april|june|july|august|september|october|november|december) ?[0-9]{1,2}/i;
var dayOfWeekRegExp = / (mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday) /ig;
// var punctuRegExp = /(\/|\(|\))/g;

// var text = "Looking for Waterloo to Square One on wed tonight at 8:30 $10 - Waterloo, Ontario";
// console.log(getTimeStr(text));

app.get('/process', function(req, res) {
    var text = req.headers.text;
    var updatedTime = req.headers.time;
    console.log(text);


    res.send(parsePost(text, updatedTime));
});

app.get('/getRoutePlaces', function(req, res) {
    var routePlaces = db.areaCodes.map(function(areaCode) {
        return { "code": areaCode, "name": placeNameDict[areaCode] };
    });
    routePlaces.sort(function(rp1, rp2) {
        return rp1.name > rp2.name;
    })
    res.send(routePlaces);
});

app.listen(4000, function() {
    console.log('Example app listening on port 4000!')
});

// parsePost("Carpool pls FREE - Toronto, Ontario  LOOKING for a ride from UW ---> Toronto (Finch or Sheppard Stn) tonight, anywhere in between 6pm to 7pm.", "2017-04-13T17:44:59+0000");
function parsePost(text, updatedTime) {
    // tokenize
    var textTokens = wpTokenizer.tokenize(text);
    // console.log(textTokens);

    // // split into origin and dest
    // var splitRegex = '(>|to)'
    // var splitResult = nlp(text).splitOn(splitRegex).data();

    // // no "to" found
    // if (splitResult.length < 3) {
    //     console.error("No to's");
    //     return;
    // }

    // var textAfterTo = splitResult.slice(2).map(function(match) {
    //     return match.text;
    // }).join();
    // // currently only support 1 route (that is, splitResult = [stringBeforeTo, theOnlyTo, stringAfterTo])
    // if (nlp(textAfterTo).splitOn(splitRegex).data().length >= 3) {
    //     console.error("Too many to's");
    //     console.log(nlp(textAfterTo).splitOn(splitRegex).data());
    //     return;
    // }

    // var originText = splitResult[0].text.replace(punctuRegExp, " $& "); // surround punctuations by whitespaces 
    // var destText = splitResult[2].text.replace(punctuRegExp, " $& ");
    // console.log("originText: " + originText);
    // // console.log("destText: " + destText);

    // var origins = nlp(originText, routePlaceLexicon).match('#MyPlace').data().map(function(matchToken) {
    //     return matchToken.normal;
    // });
    // // when people omit origins, they mean from uw
    // if (origins.length == 0) {
    //     origins = ['uw'];
    // }

    var parsedRoutes = parseRoute(text);
    if (!parsedRoutes || parsedRoutes.length == 0) {
        return;
    }

    // var matchedRoute = parsedRoutes[0]; // currently only support 1 route

    // var newRoute = {
    //     "origin_area": matchedRoute[0].areaCode,
    //     "dest_area": matchedRoute[1].areaCode,
    //     "origin_locs": [placeNameDict[matchedRoute[0].placeCode]],
    //     "dest_locs": [placeNameDict[matchedRoute[1].placeCode]],
    // };
    var routes = parsedRoutes;

    // possible fb geo info hiding in dest part, need to find it first
    // var destTextTokens = wpTokenizer.tokenize(destText);
    // console.log("destTextTokens: " + destTextTokens);
    // for (var i = 0; i < destTextTokens.length; i++) {
    //     var token = destTextTokens[i];
    //     if (token == ' - ' && i + 3 < destTextTokens.length) { // found suspicious fb geoinfo
    //         if (nlp(destTextTokens[i + 1], fbGeoInfoLexicon).places().data().length > 0 && // next token is a place
    //             destTextTokens[i + 2] == ', ' &&
    //             nlp(destTextTokens[i + 3], fbGeoInfoLexicon).places().data().length > 0) {
    //             destTextTokens = destTextTokens.slice(0, i);
    //             break;
    //         }
    //     }
    // }
    // var dests = nlp(destTextTokens.join(' '), routePlaceLexicon).match('#MyPlace').data().map(function(matchToken) {
    //     return matchToken.normal;
    // });

    // console.log("origins: " + origins);
    // console.log("dests: " + dests);

    // // get area string
    // // get unique areas
    // var originAreas = origins.slice(0),
    //     destAreas = dests.slice(0);
    // originAreas = removeDuplicatesBy(originAreas, function(place) {
    //     return places[place].areaCode;
    // });
    // destAreas = removeDuplicatesBy(destAreas, function(place) {
    //     return places[place].areaCode;
    // });

    // console.log("origin areas: " + originAreas);
    // console.log("dest areas: " + destAreas);

    // generate routes
    // var routes = [];
    // originAreas.forEach(function(originArea) {
    //     destAreas.forEach(function(destArea) {
    //         if (originArea != destArea) {
    //             // get specific location strings
    //             var originLocStrs, destLocStrs;
    //             // get unique places
    //             var originPlaces = origins.filter(function(place) {
    //                 return places[place].areaCode == originArea;
    //             });
    //             var destPlaces = dests.filter(function(place) {
    //                 return places[place].areaCode == destArea;
    //             });
    //             originPlaces = removeDuplicatesBy(originPlaces, function(place) {
    //                 return places[place].placeCode;
    //             });
    //             destPlaces = removeDuplicatesBy(destPlaces, function(place) {
    //                 return places[place].placeCode;
    //             });
    //             // if places fit in two lines
    //             if (originPlaces.length <= 2 && destPlaces.length <= 2) {
    //                 // sort by place level
    //                 originPlaces.sort(placeCodeLvlComp);
    //                 destPlaces.sort(placeCodeLvlComp);
    //                 // generate user-friendly location strings
    //                 originLocStrs = originPlaces.map(function(placeCode) {
    //                     return placeNameDict[placeCode];
    //                 });
    //                 destLocStrs = destPlaces.map(function(placeCode) {
    //                     return placeNameDict[placeCode];
    //                 });
    //             }

    //             var newRoute = {
    //                 "origin_area": originArea,
    //                 "dest_area": destArea,
    //                 "origin_locs": originLocStrs,
    //                 "dest_locs": destLocStrs,
    //             };
    //             routes.push(newRoute);
    //         }
    //     });
    // })

    // get date and time
    // get date
    // var date = nlp(text).dates().data()[0].date;
    // var dateStr;
    // if (date.month != undefined && date.date != undefined) {
    //     dateStr = MONTHS[date.month] + " " + date.date + " ";
    // } else if (date.weekday != undefined) {
    //     dateStr = DAYS_OF_WEEK[date.weekday] + " ";

    // }
    // dateStr += date.time.hour + ":" + (date.time.minute ? date.time.minute.slice(-2) : "00");

    var timeStr = getTimeStr(text);
    var dateStr = getDateStr(text, updatedTime) + " " + (timeStr ? timeStr : "");
    console.log("date: " + dateStr);
    var standardDate = sugar.Date.create(dateStr);
    // var dateTokens = tokenizer.tokenize(nlp(text).match('#Date').out());
    // console.log(dateTokens);
    // for (var i = 0; i < dateTokens.length; i++) {
    //     if (isDayOfWeek(dateTokens[i])) {
    //         dateTokens.splice(i, 1);
    //         break;
    //     }
    // }
    // var date = dateTokens.join(' ');
    // var timeMatches = text.match(new RegExp('[0-9]{1,2}(:[0-9]{2,2})? ?(am|pm)'));
    // var standardDate;
    // if (timeMatches.length > 0) {
    //     standardDate = sugar.Date.create(date + " " + timeMatches[0]);
    // }

    // get price
    var priceMatches = text.match(new RegExp('\\$[0-9]+'));
    var price;
    if (priceMatches) {
        price = priceMatches[0];
    }

    var msg = {
        "data": {
            "post_offering": true,
            "routes": routes,
            "date": standardDate,
            "price": price
        }
    };

    return msg;
}

function removeDuplicatesBy(arr, func) {
    var mappedArr = arr.map(func);
    return mappedArr.filter(function(item, pos) {
        return mappedArr.indexOf(item) == pos;
    })
}

function placeCodeLvlComp(pc1, pc2) {
    return placeLvlDict[pc2] - placeLvlDict[pc1];
}

// var myMatch = parseRoute("Offering carpool - Sunday Apr. 16 Waterloo->Toronto DT at 7:30pm $15 - University of Waterloo  Pickup: UW plaza BK (leaving at 7:30 pm) Dropoff: King Subway Station  BMW SUV (2015 new car) + many years of G license  Text at 2268086656 (Do NOT inbox as I won't be able to check)");
// console.log(myMatch);
// TODO: fb geo
function parseRoute(str) {
    var fbGeoRegExp = / - \S+, \S+/;
    var matchedFbGeoStr = str.match(fbGeoRegExp);
    var matchedFbGeoNlp = nlp(matchedFbGeoStr, fbGeoInfoLexicon).match("#Place").data();
    if (matchedFbGeoNlp.length == 2) { // match found
        str = str.replace(fbGeoRegExp, "");
    }
    // console.log(str);

    var removePuncRegExp = /[.,#!$%\^\*;:{}=_`~\(\)]/g;
    var multipleWhitespacesRegExp = / +/g;

    var acceptedPunc = "-<>\/ ";
    var acceptedPuncRegExp = "[" + acceptedPunc + "]";
    var nonAcceptedPuncRegExp = "[^" + acceptedPunc + "]";

    var spaceBeforePuncRegExp = new RegExp(nonAcceptedPuncRegExp + "(?=" + acceptedPuncRegExp + ")", "g");
    var spaceAfterPuncRegExp = new RegExp(acceptedPuncRegExp + "(?=" + nonAcceptedPuncRegExp + ")", "g");

    str = str.replace(removePuncRegExp, " "); // remove unwatned punctuations
    str = str.replace(spaceBeforePuncRegExp, "$& ").replace(spaceAfterPuncRegExp, "$& ");
    str = str.replace(multipleWhitespacesRegExp, " "); // reduce multiple whitepsaces to 1
    var tokens = str.split(" ");
    // console.log(tokens);

    console.log(str);


    // console.log(nlpPlaces);

    // find #To using regex
    // var toTags = [];
    var toRegex = /(-*>+|-+>*| to )/i;

    // split str into origins and dests (one route only)
    var strClauses = str.split(toRegex);
    var fromClause = strClauses[0];
    var toClause = strClauses[2];
    console.log(fromClause);
    console.log(toClause);

    // find places using nlp match
    var getNlpMatchNormal = function(matchedPlace) {
        return matchedPlace.normal;
    }
    var origins = nlp(fromClause, routePlaceLexicon).match("#RoutePlace").data().map(getNlpMatchNormal);
    var dests = nlp(toClause, routePlaceLexicon).match("#RoutePlace").data().map(getNlpMatchNormal);


    // var strFirstDest = strToClause.match(/\S+/)[0];
    // var nlpFirstDestIdx = nlpPlaces.indexOf(strFirstDest.toLowerCase());
    // var origins = nlpPlaces.slice(0, nlpFirstDestIdx);
    // var dests = nlpPlaces.slice(nlpFirstDestIdx);




    // unusedPlaces = [],
    //     placeComponentBuffer = [],
    //     origins = [],
    //     dests = [];
    // placeTypeExpecting = 0; // 0 - nothing, 1 - origin, 2- dest
    // tokens.forEach(function(token) {
    //     parseToken(token);
    // });

    if (dests.length == 0) {
        return;
    }
    if (origins.length == 0) {
        origins = defaultOrigins;
    }
    // console.log(origins);
    // console.log(dests);

    var getPlaceByPlaceCodeFn = function(placeCode) {
        return places[placeCode];
    };

    origins = origins.map(getPlaceByPlaceCodeFn);
    dests = dests.map(getPlaceByPlaceCodeFn);

    var getPlaceAreaCodeFn = function(place) {
        return place.areaCode;
    };
    var originAreas = removeDuplicatesBy(origins, getPlaceAreaCodeFn);
    var destAreas = removeDuplicatesBy(dests, getPlaceAreaCodeFn);
    // console.log(originAreas);
    // console.log(destAreas);

    var routes = [];
    originAreas.forEach(function(originArea) {
        destAreas.forEach(function(destArea) {
            if (originArea == destArea) {
                return;
            }

            var originPlace = getMostSpecifcPlaceOfArea(origins, originArea);
            var destPlace = getMostSpecifcPlaceOfArea(dests, destArea);
            routes.push({
                "originArea": originPlace.areaCode,
                "originPlace1": placeNameDict[originPlace.placeCode],
                "originPlace2": originPlace.placeCode == originPlace.areaCode ? "" : placeNameDict[originPlace.areaCode],
                "destArea": destPlace.areaCode,
                "destPlace1": placeNameDict[destPlace.placeCode],
                "destPlace2": destPlace.placeCode == destPlace.areaCode ? "" : placeNameDict[destPlace.areaCode],
            });
        });
    });

    return routes;
}

// var unusedPlaces, placeComponentBuffer, origins, dests, placeTypeExpecting;
function parseToken(token) {
    var newPlaceComponent = (placeComponentBuffer.length != 0 ? placeComponentBuffer.join(" ") + " " : "") + token;
    if (isTokenPlaceComponent(newPlaceComponent)) {
        placeComponentBuffer.push(token);
    } else {
        // place component chain is broken, try matching place in the order: 
        // 1. stuff in buffer + token is a valid place
        // 2. any combination in buffer / token alone is a valid place
        var matchedPlace;
        var parsingPlaceToken = placeComponentBuffer.join(" ") + " " + token;

        // stuff in buffer + token
        var macthedParsingPlace = matchTokenPlace(parsingPlaceToken);
        if (macthedParsingPlace) {
            matchedPlace = macthedParsingPlace;
            placeComponentBuffer = [];
        } else { // greedy match stuff in buffer
            for (var i = placeComponentBuffer.length; i > 0; i--) {
                var myBufferedPlaceToken = placeComponentBuffer.slice(0, i).join(" ");
                var myMatchedBufferedPlace = matchTokenPlace(myBufferedPlaceToken);
                if (myMatchedBufferedPlace) {
                    matchedPlace = myMatchedBufferedPlace;
                    // remove matched part from buffer
                    placeComponentBuffer.splice(0, i);

                    // redo the parsing for the remainning tokens in buffer as well as the current token
                    var redoTokens = placeComponentBuffer.slice(0, placeComponentBuffer.length);
                    placeComponentBuffer = [];

                    redoTokens.forEach(function(redoToken) {
                        parseToken(redoToken);
                    });

                    return;
                }
            }
            // no match in buffer found, clear buffer, try match current token
            matchedPlace = matchTokenPlace(token);
        }

        if (matchedPlace) {
            switch (placeTypeExpecting) {
                case 0:
                    unusedPlaces.push(matchedPlace);
                    break;
                case 1:
                    origins.push(matchedPlace);
                    break;
                case 2:
                    dests.push(matchedPlace);
                    break;
                default:
                    break;
            }
        } else if (isTokenFrom(token)) {
            placeTypeExpecting = 1;
        } else if (isTokenTo(token)) {
            placeTypeExpecting = 2;
            if (origins.length == 0) {
                origins = unusedPlaces;
            }
        }
    }
}

function getMostSpecifcPlaceOfArea(myPlaces, area) {
    myPlaces = myPlaces.filter(function(myPlace) {
        return myPlace.areaCode == area;
    });
    myPlaces.sort(function(p1, p2) {
        return placeLvlDict[p2.placeCode] - placeLvlDict[p1.placeCode];
    })
    return myPlaces[0];
}

function matchTokenPlace(tok) {
    for (var key in places) {
        if (isStringMatch(tok, key, false)) {
            return places[key];
        }
    }
    return null;
}

function isTokenPlaceComponent(tok) {
    return placeComponents[tok] ? true : false;
}

function isTokenFrom(tok) {
    return tok.match(/^from$/i) != null;
}

function isTokenTo(tok) {
    return tok.match(/(^-$|^-*>$|^to$)/i) != null;
}

function isStringMatch(str1, str2, caseSensitive) {
    if (!caseSensitive) {
        str1 = str1.toUpperCase();
        str2 = str2.toUpperCase();
    }
    return (natural.LevenshteinDistance(str1, str2) / Math.max(str1.length, str2.length)) < LEVENSHTEIN_MATCH_RATIO;
}

// function parseRouteRecur(str, regExpStr, options, recurCount) {
//     var tag = regExpStr.match(/#[^#]+#/);
//     tag = tag ? tag[0] : null;
//     if (tag && tag == "#place#") {
//         var routes = [];
//         for (var key in places) {
//             try {
//                 var resBeforeTag = regExpStr.substring(0, regExpStr.match(new RegExp(tag), 'g').index); // regular expression string before the tag
//                 // match the stuff before the tag first, if it's a fail then no need to try the other tags
//                 if (!str.match(new RegExp(resBeforeTag, options))) {
//                     return null;
//                 }
//             } catch (err) {

//             }

//             // replace two places together (hardcoded for regExpStr)
//             var newRes = regExpStr.replace(/#[^#]+#/, key).replace(/#[^#]+#/, key);
//             var matchResult = parseRouteRecur(str, newRes, options, recurCount + 1);
//             if (matchResult) {
//                 matchResult.unshift(places[key]);
//                 if (recurCount == 0) {
//                     routes.push(matchResult);
//                 } else {
//                     return matchResult;
//                 }
//             }
//         }
//         if (recurCount == 0) {
//             routes.sort(function(r1, r2) {
//                 // sort by their matched indicies
//                 return r1[r1.length - 1] - r2[r2.length - 1];
//             }).map(function(r) {
//                 // remove matched indicies
//                 return r.splice(-1, 1);
//             });
//             return routes;
//         }
//     } else {
//         var matchResult = str.match(new RegExp(regExpStr, options));
//         return matchResult ? [matchResult.index] : null; // save matched index for sorting
//     }
//     return null;
// }

// console.log(getDateStr("Looking for a ride from Scarbrough/STC to Waterloo Friday afternoon."));
function getDateStr(text, updatedTime) {
    // exact date first
    var dateMatch = text.match(dateRegExp);
    if (dateMatch) {
        var dateStr = dateMatch[0];
        dateStr = dateStr.replace(/[^0-9](?=[0-9])/, " "); // add space between month and date
        return dateStr;
    }

    // day of week
    var dayOfWeekMatch = text.match(dayOfWeekRegExp);
    if (dayOfWeekMatch) {
        // currently only support one date
        if (dayOfWeekMatch.length == 1) {
            // remove extra whitespace from matching and convert to lower case
            return myDayOfWeekDict[dayOfWeekMatch[0].replace(/ /g, "").toLowerCase()];
        }
        return;
    }

    // natural words like "tomorrow" ...
    var updatedDate = new Date(updatedTime);
    if (text.match(/(today|this afternoon|this evening|tonight)/i)) {
        var updatedMonth = parseInt(updatedDate.getMonth()) + 1;
        return updatedDate.getFullYear() + "-" + updatedMonth + "-" + updatedDate.getDate();
    }
    if (text.match(/(tomorrow)/i)) {
        updatedDate = new Date(updatedDate.getTime() + 24 * 60 * 60 * 1000);
        var updatedMonth = parseInt(updatedDate.getMonth()) + 1;
        return updatedDate.getFullYear() + "-" + updatedMonth + "-" + updatedDate.getDate();
    }

    // maybe date is omitted, return "today"
    return "today";
}

function getTimeStr(text) {
    // hour, minute, 12 hour
    var hm12 = text.match(/[0-9]{1,2} ?: ?[0-9]{2} ?(am|pm)/i);
    if (hm12) {
        return hm12[0];
    }

    // hour, 12 hour
    var h12 = text.match(/[0-9]{1,2} ?(am|pm)/i);
    if (h12) {
        return h12[0];
    }

    // hour, minute, 24 hour, 1pm to 11pm
    var hm24p = text.match(/(1[3-9]|2[0-3]) ?: ?[0-9]{2}/);
    if (hm24p) {
        return hm24p[0];
    }

    // look for words that describes am/pm
    var ampm = 0; // 0 - undetermined; 1 - am; 2 - pm
    if (text.match(/morning/i)) {
        ampm = 1;
    } else if (text.match(/(afternoon|night|evening)/i)) {
        ampm = 2;
    }

    // hour, minute
    var hm = text.match(/[0-9]{1,2} ?: ?[0-9]{2}/);
    if (hm) {
        switch (ampm) {
            case 0:
                break;
            case 1:
                return hm[0] + " am";
                break;
            case 2:
                return hm[0] + " pm";
                break;
            default:
                break
        }
    }

    // hour
    var hour = text.match(/[0-9]{1,2}/);
    if (hour) {
        switch (ampm) {
            case 0:
                break;
            case 1:
                return hour[0] + " am";
                break;
            case 2:
                return hour[0] + " pm";
                break;
            default:
                break
        }
    }

}

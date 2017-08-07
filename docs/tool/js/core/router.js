"use strict";

var router = {
    isFilterInitialized: false,
    stateObj: {},
    initFilters: function(msg,data){
        if ( router.isFilterInitialized ) return;
        setSubs([
            ['filterValues', router.pushFilter]
    //        ['nullsShown', router.nullsHandler] // triggered when the nullsShown check is toggled. not when a filter range is adjusted
        ]);        
        router.isFilterInitialized = true;
        if ( router.hasInitialFilterState ) router.decodeState();
    },
    initBuilding: function() {
        router.initialView = 'building';
        router.buildingID = window.location.hash.match(/building=([\w\d-]+)/)[1];
    },
    pushFilter: function(msg, data){
        // TO DO: add handling for sidebar and preview pusher
        if (data.length === 0) {
            delete router.stateObj[msg];
        } else {
            router.stateObj[msg] = data;
        }
        if ( Object.keys(router.stateObj).length === 0 ) {
            window.history.replaceState(router.stateObj, 'newState', '#');
        } else {
            window.history.replaceState(router.stateObj, 'newState', '#/HI/' + router.paramifyFilter());        
        }
    },
    pushViewChange: function(msg, data){
        if (data.el === 'building-view'){
            var buildingID = getState().selectedBuilding[0].properties.nlihc_id;
            window.history.pushState(router.stateObj, 'newState', '#/HI/building=' + buildingID);
        }
    },
    paramifyFilter: function(){
        var paramsArray = [];
        for (var key in router.stateObj) {
            if (!router.stateObj.hasOwnProperty(key)) continue;
            var dataChoice = dataChoices.find(function(obj){
                return key.split('.')[1] === obj.source;
            });
            var separator = getState()['nullsShown.' + dataChoice.source] && getState()['nullsShown.' + dataChoice.source][0] ? '-' : '_';
            
            if ( dataChoice.component_type === 'continuous' ) {
                paramsArray.push(dataChoice.short_name + '=' + Math.round(router.stateObj[key][0]) + separator + Math.round(router.stateObj[key][1])); 
            }
            if ( dataChoice.component_type === 'categorical' ){
                paramsArray.push( dataChoice.short_name + '=' + router.stateObj[key].join('+'));
            }
            if ( dataChoice.component_type === 'date' ){
                var dateStrings = [];
                for ( var i = 0; i < 2; i++ ){ // i < 2 bc index 2 is true/false of nullsShown
                    var date = router.stateObj[key][i].getDate();
                    var month = router.stateObj[key][i].getMonth() + 1;
                    var year = router.stateObj[key][i].getFullYear();
                    dateStrings[i] = 'd' + date.toString() + 'm' + month.toString() + 'y' + year.toString(); 
                }
                paramsArray.push(dataChoice.short_name + '=' + dateStrings[0] + separator + dateStrings[1]);
            }
        }
     //   console.log(paramsArray.join('&'));
        return paramsArray.join('&').replace(/ /g,'_');
    },
    screenLoad: function(){
        document.getElementById('loading-state-screen').style.display = 'block';
    },
    decodeState: function(){
        console.log("decoding state from URL");
        var stateArray = window.location.hash.replace('#/HI/','').split('&');
        stateArray.forEach(function(each){
            var eachArray = each.split('=');
            var dataChoice = dataChoices.find(function(obj){
                return obj.short_name === eachArray[0];
            });
            var filterControlObj = filterView.filterControlsDict[dataChoice.short_name]

            if ( dataChoice.component_type === 'continuous' ) {
                var separator = eachArray[1].indexOf('-') !== -1 ? '-' : '_';
                var values = eachArray[1].split(separator);
                var min = +values[0]
                var max = +values[1]
                var nullsShown = separator === '_' ? false : true;
                
                filterControlObj.set(min,max,nullsShown);
                
            }
            if ( dataChoice.component_type === 'categorical' ){
                var values = eachArray[1].replace(/_/g,' ').split('+');
                $('.ui.dropdown.'+'dropdown-' + dataChoice.source).dropdown('set selected', values);
            }   
            if ( dataChoice.component_type === 'date' ){
                // handle decoding for date type filter here
                var separator = eachArray[1].indexOf('-') !== -1 ? '-' : '_';
                var values = eachArray[1].split(separator);
                filterView.filterInputs[dataChoice.short_name].setValues(
                    [
                        [ 'year',  values[0].match(/\d{4}/)[0] ],
                        [ 'month', values[0].match(/m(\d+)/)[1] ],
                        [ 'day',   values[0].match(/d(\d+)/)[1]]
                    ],
                    [
                        [ 'year',  values[1].match(/\d{4}/)[0] ],
                        [ 'month', values[1].match(/m(\d+)/)[1] ],
                        [ 'day',   values[1].match(/d(\d+)/)[1]]
                    ]
                );
                 if ( separator === '_') { // encoded nullShown == false
                    document.querySelector('[name="showNulls-' + dataChoice.source + '"]').checked = false;
                    setState('nullsShown.' + dataChoice.source, false); // this will eventually trigger the callback
                                                                        // so no need to trigger it here
                } else { // call the corresponding textInput's callback
                    filterView.filterInputs[dataChoice.short_name].callback();
                }
            }

        });

        this.clearScreen();
    },
    clearScreen: function(){
        document.getElementById('loading-state-screen').style.display = 'none';
    },
    inAppBack: function(){
        if ( getState().activeView.length > 1 ) {
            window.history.back(); // if there's a previously active view, use history.back() function. router will pick up
                                   // on the hash change
        } else { // if not, need custom handling; otherwise the in-app back button will navigate to whatever the previous page
                 // is, outside of the domain. ok for browser's back button to do that, but not the in-app back
            location.hash = ' ';
            location.reload();
        }
    },
    hashChangeHandler: function(){
        controller.goBack();
    },
    nullsHandler: function (msg,data) { // for handling when a nullsShown checkbox is toggled. needs to grab values of the filter
        var component = msg.split('.')[1];
        var dataChoice = dataChoices.find(function(each){
            return each.source === component;
        });
        var type = dataChoice.component_type;
        var shortName = dataChoice.short_name;
        if ( type === 'categorical' ) {
            // i think this is a null set; no unknowns in categorical filters
        }
        if ( type === 'continuous' ) {

        }
        if ( type === 'date' ) {

        }
        if ( type === 'location' ) {
            // to come
        }
    }

};
window.onhashchange = function() {
 router.hashChangeHandler();
}
if ( window.location.hash.indexOf('#/HI/') !== -1 ) {
    if ( window.location.hash.indexOf('building=') !== -1 ){
        router.initBuilding();
    } else {
        router.hasInitialFilterState = true;
    }
    router.screenLoad();
} else {
    router.hasInitialFilterState = false;
}
dojo.require("esri.map");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("esri.tasks.find");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.Button");
dojo.require("esri.dijit.Popup");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.tasks.locator");
dojo.require("esri.dijit.Legend");


var findTask, findParams;
var map, startExtent;
var grid, store;
var identifyTask,identifyParams;

function init() {
    //onorientationchange doesn't always fire in a timely manner in Android so check for both orientationchange and resize
    var supportsOrientationChange = "onorientationchange" in window,
        orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

    window.addEventListener(orientationEvent, function () {
        orientationChanged();
    }, false);
    function orientationChanged() {
        console.log("Orientation changed: " + window.orientation);
        if(map){
          map.reposition();
          map.resize();
        }
      }
    dojo.connect(grid, "onRowClick", onRowClickHandler);

    //Create map and add the ArcGIS Online imagery layer
    startExtent = new esri.geometry.Extent({ "xmin": -9459781, "ymin": 4748484, "xmax": -9382885, "ymax": 4770727, "spatialReference": { "wkid": 102113 } });
    //create a popup to replace the map's info window
    var popup = new esri.dijit.Popup(null, dojo.create("div"));
    map = new esri.Map("map", { extent: startExtent, infoWindow: popup });
    var streetMapLayer = new esri.layers.ArcGISTiledMapServiceLayer("http://gis.oki.org/ArcGIS/rest/services/Maps/okibasemap_minimal/MapServer");
    map.addLayer(streetMapLayer);
    //define a popup template
    var popupTemplate = new esri.dijit.PopupTemplate({
        title: "{address}",
        fieldInfos: [
        {fieldName: "Main_Stree", visible: true, label:"Main Street"},
        {fieldName: "Cross_Stre", visible:true, label:"Cross Street"},
        {fieldName: "AADT", visible: true, label:"AADT"},
        {fieldName: "CountYear", visible: true, label:"Year"}
        ],
        showAttachments:true
    });
    //create a feature layer based on the feature collection
    var featureLayer = new esri.layers.FeatureLayer("http://gis.oki.org/ArcGIS/rest/services/OP/TrafficCounts/MapServer/0", {
        mode: esri.layers.FeatureLayer.MODE_SNAPSHOT,
        infoTemplate: popupTemplate,
        outFields: ['Main_Stree','Cross_Stre','AADT','CountYear']
    });
    // featureLayer.setDefinitionExpression("Main_Stree != ''");
    dojo.connect(featureLayer,"onClick",function(evt){
        map.infoWindow.setFeatures([evt.graphic]);
    });
    //add the legend
    //todo look up onLayersAddResult
    dojo.connect(map,'onLayersAddResult',function(results){
    var layerInfo = dojo.map(results, function(layer,index){
        return {layer:layer.layer,title:layer.layer.name};
    });
    if(layerInfo.length > 0){
    var legendDijit = new esri.dijit.Legend({
        map:map,
        layerInfos:layerInfo
        },"legendDiv");
        legendDijit.startup();
        }
    });
     
    //map.addLayer(featureLayer);
    // for legend items add them here
    map.addLayers([featureLayer]);

    //Create Find Task using the URL of the map service to search
    findTask = new esri.tasks.FindTask("http://gis.oki.org/ArcGIS/rest/services/OP/TrafficCounts/MapServer/");

    //Create the find parameters
    findParams = new esri.tasks.FindParameters();
    findParams.returnGeometry = true;
    findParams.layerIds = [0];
    findParams.searchFields = ["Main_Stree", "Cross_Stre"];
    findParams.outSpatialReference = map.spatialReference;

    dojo.connect(map, 'onLoad', function (theMap) {
        //resize the map when the browser resizes
        dojo.connect(dijit.byId('map'), 'resize', map, map.resize);
    });
}

function doFind() {
    //Set the search text to the value in the box
    findParams.searchText = dojo.byId("streetName").value;
    findTask.execute(findParams, showResults);
}

function showResults(results) {
    //This function works with an array of FindResult that the task returns
    map.graphics.clear();
    var symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 10, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1), new dojo.Color([0, 255, 0, 0.25]));

    //create array of attributes
    var items = dojo.map(results, function (result) {
        var graphic = result.feature;
        graphic.setSymbol(symbol);
        map.graphics.add(graphic);
        return result.feature.attributes;
    });


    //Create data object to be used in store
    var data = {
        identifier: "OBJECTID",  //This field needs to have unique values
        label: "OBJECTID", //Name field for display. Not pertinent to a grid but may be used elsewhere.
        items: items
    };

    //Create data store and bind to grid.
    store = new dojo.data.ItemFileReadStore({ data: data });
    var grid = dijit.byId('grid');
    grid.setStore(store);

    //Zoom back to the initial map extent
    map.setExtent(startExtent);

}

//Zoom to the parcel when the user clicks a row
function onRowClickHandler(evt) {
    var clickedTrafficCountId = grid.getItem(evt.rowIndex).OBJECTID;
    var selectedTrafficCount;

    dojo.forEach(map.graphics.graphics, function (graphic) {
        if ((graphic.attributes) && graphic.attributes.OBJECTID === clickedTrafficCountId) {
            selectedTrafficCount = graphic;
            return;
        }
    });
    map.centerAndZoom(selectedTrafficCount.geometry, 5);
}
//use the geolocation api to get the current location
function getLocation() {
    if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(zoomToLocation, locationError);
        }
      }

      function locationError(error) {
        switch (error.code) {
        case error.PERMISSION_DENIED:
          console.log("Location not provided");
          break;
        case error.POSITION_UNAVAILABLE:
          console.log("Current location not available");
          break;
        case error.TIMEOUT:
          console.log("Timeout");
          break;
        default:
          console.log("unknown error");
          break;
        }
      }
function zoomToLocation(location) {
  var pt = esri.geometry.geographicToWebMercator(new esri.geometry.Point(location.coords.longitude, location.coords.latitude));
  map.centerAndZoom(pt, 22);
}

dojo.addOnLoad(init);
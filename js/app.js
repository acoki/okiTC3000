dojo.require("esri.map");
dojo.require("esri.tasks.find");
dojo.require("esri.dijit.popup");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.dijit.Legend");

var findTask, findParams;
var map, startExtent;
// var grid, store;
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
 
    //Create map and add the ArcGIS Online imagery layer
    startExtent = new esri.geometry.Extent({ "xmin": -9409886, "ymin": 4739912, "xmax": -9405586, "ymax": 4742778, "spatialReference": { "wkid": 102113 } });
    //XMin: -9409886.10 YMin: 4739912.07 XMax: -9405586.52 YMax: 4742778.46
    //create a popup to replace the map's info window
    var popup = new esri.dijit.Popup(null, dojo.create("div"));
    map = new esri.Map("map", { extent: startExtent, infoWindow: popup, logo:false });
    var streetMapLayer = new esri.layers.ArcGISTiledMapServiceLayer("http://gis.oki.org/ArcGIS/rest/services/Maps/okibasemap_minimal/MapServer");
    map.addLayer(streetMapLayer);
    //define a popup template
    var popupTemplate = new esri.dijit.PopupTemplate({
        title: "",
        fieldInfos: [
        {fieldName: "Main_Street", visible: true, label:"MainStreet"},
        {fieldName: "Cross_Street", visible:true, label:"CrossStreet"},
        {fieldName: "AADT_", visible: true, label:"AADT", format: {places: 0,digitSeparator: true}},
        {fieldName: "Year_", visible: true, label:"Year"}
        // {fieldName: "CountYear2000", visible: true, label:"2000", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2003", visible: true, label:"2003", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2004", visible: true, label:"2004", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2005", visible: true, label:"2005", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2006", visible: true, label:"2006", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2007", visible: true, label:"2007", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2008", visible: true, label:"2008", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2009", visible: true, label:"2009", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2010", visible: true, label:"2010", format: {places: 0,digitSeparator: true}},
        // {fieldName: "CountYear2011", visible: true, label:"2011", format: {places: 0,digitSeparator: true}}
        ],
        // mediaInfos: [{
        //     type: "linechart",
        //     value: {
        //       fields: ["CountYear2000", "CountYear2003", "CountYear2004", "CountYear2005", "CountYear2006", "CountYear2007", "CountYear2008", "CountYear2009", "CountYear2010", "CountYear20011"],
        //       theme: ""
        //     }
        //   }],
        showAttachments:false
    });
    //create a feature layer based on the feature collection
    var featureLayer = new esri.layers.FeatureLayer("http://gis.oki.org/ArcGIS/rest/services/OP/TrafficCounts/MapServer/0", {
        mode: esri.layers.FeatureLayer.MODE_SNAPSHOT,
        infoTemplate: popupTemplate,
        outFields: ['OKIID', 'Main_Street','Cross_Street','AADT_','Year_', 'CountYear2000' , 'CountYear2003', 'CountYear2004', 'CountYear2005', 'CountYear2006', 'CountYear2007', 'CountYear2008', 'CountYear2009', 'CountYear2010', 'CountYear2011']
    });
    // featureLayer.setDefinitionExpression("Main_Street != ''");
    dojo.connect(featureLayer,"onClick",function(evt){
      console.log("onClick Event");
        map.infoWindow.setFeatures([evt.graphic]);
    });
    //add the legend
    dojo.connect(map,'onLayersAddResult',function(results){
      console.log("Map onLoad event");
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

    // for legend items add them here
    map.addLayers([featureLayer]);

    //Create Find Task using the URL of the map service to search
    findTask = new esri.tasks.FindTask("http://gis.oki.org/ArcGIS/rest/services/OP/TrafficCounts/MapServer/");

    //Create the find parameters
    findParams = new esri.tasks.FindParameters();
    findParams.returnGeometry = true;
    findParams.layerIds = [0];
    findParams.searchFields = ["Main_Street", "Cross_Street", "Jurisdiction"];
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
    //clear existing list results
    $('#searchList li').remove();
}
function showResults(results) {
  //create a pick list of results
  $.each(results, function(i, result) {
    var li = $('<li class="searchResult"/>');
    //create the list content
    var at = " @ ";
    var content = "<a href='#' data-result='"+JSON.stringify(result)+"'>";
    content += result.feature.attributes.Main_Street += at += result.feature.attributes.Cross_Street+"</a>";

    li.append(content);
    //add the list item to the feature type list
    $('#searchList').append(li);
  });

  //refresh the featurelist so the jquery mobile style is applied
  $('#searchList').listview();
  $('#searchList').listview('refresh');
}
 $(".searchResult")
    .live("click", function(e) {
      e.preventDefault();
      var r = jQuery.parseJSON($(this).find("a").attr("data-result"));
      addResult(r);
    });

 function addResult(result) {
   //clear any existing graphics
   map.graphics.clear();
   map.centerAndZoom(result.feature.geometry, 5);
//close the dialog
   $('#searchDialog').dialog('close');
 }

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
// $("#map").fidget({ pinch: function(event, fidget){
//       //var mapPoint = map.toMap(new esri.geometry.Point(event.x, event.y));
      
//       switch(fidget.pinch.direction){
//          case "in": map.setLevel(map.getLevel() - 1); fidget.pinch.direction = "unknown"; break;
//          case "out": map.setLevel(map.getLevel() + 1); fidget.pinch.direction = "unknown"; break;
//          //case "in": map.centerAndZoom(mapPoint, map.getLevel() - 1); break;
//          //case "out": map.centerAndZoom(mapPoint, map.getLevel() + 1); break;
//          case "unknown": break;
//       }
//    } });
function hideAddressBar()
      {
          if(!window.location.hash)
          {
              if(document.height <= window.outerHeight + 10)
              {
                  document.body.style.height = (window.outerHeight + 50) +'px';
                  setTimeout( function(){ window.scrollTo(0, 1); }, 50 );
              }
              else
              {
                  setTimeout( function(){ window.scrollTo(0, 1); }, 0 );
              }
          }
      }

      window.addEventListener("load", hideAddressBar );
      window.addEventListener("orientationchange", hideAddressBar );
dojo.addOnLoad(init);
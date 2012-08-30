dojo.require("esri.map");
dojo.require("esri.tasks.find");
dojo.require("esri.dijit.Popup");
dojo.require("esri.layers.FeatureLayer");
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
    startExtent = new esri.geometry.Extent({ "xmin": -9409886, "ymin": 4739912, "xmax": -9405586, "ymax": 4742778, "spatialReference": { "wkid": 102113 } });
    //XMin: -9409886.10 YMin: 4739912.07 XMax: -9405586.52 YMax: 4742778.46
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
        {fieldName: "AADT", visible: true, label:"AADT", format: {places: 0,digitSeparator: true}},
        {fieldName: "CountYear", visible: true, label:"Year"}
        ],
        showAttachments:true
    });
    popup.maximize();
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
    content += result.feature.attributes.Main_Stree += at += result.feature.attributes.Cross_Stre+"</a>";

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
// Load the Visualization API and the piechart package.
google.load('visualization', '1.0', {'packages':['corechart']});

// Set a callback to run when the Google Visualization API is loaded.
google.setOnLoadCallback(drawCategoryBarChart);
google.setOnLoadCallback(drawIntervalLineChart);
google.setOnLoadCallback(drawIntervalLineChartCategory);
google.setOnLoadCallback(drawCategoryBarPoliceChart);
google.setOnLoadCallback(drawIntervalLinePoliceChart);
google.setOnLoadCallback(drawIntervalLinePoliceChartCategory);


// The actual drawing functions.
function drawCategoryBarChart() {

  var data = google.visualization.arrayToDataTable([
    ['Category', 'Number'],
    ['Aid Response',164222],
    ['Medic Response',53443],
    ['Auto Fire Alarm',17831],
    ['Trans to AMR',10349],
    ['Motor Vehicle Accident',8863],
    ['Aid Response Yellow',6462],
    ['Automatic Fire Alarm Resd',4567],
    ['Automatic Medical Alarm',3982],
    ['1RED 1 Unit',3164],
    ['Medic Response- 7 per Rule',2553],
    ['Rescue Elevator',2247],
    ['Motor Vehicle Accident Freeway',2054],
    ['Investigate Out Of Service',1789],
    ['Medic Response- 6 per Rule',1740],
    ['Alarm Bell',1458],
    ['Illegal Burn',1441],
    ['Hang-Up- Aid',1431],
    ['Automatic Fire Alarm False',1279],
    ['Car Fire',1205],
    ['Water Job Minor',1180],
    ['Natural Gas Odor',1026],
    ['4RED - 2 + 1 + 1',994],
    ['EVENT - Special Event',952],
    ['Unk Odor',926],
    ['Quick Dispatch Medic',851],
    ['Activated CO Detector',827],
    ['Fire in Building',805],
    ['Rescue Lock In/Out',685],
    ['Assault w/Weap 7 per Rule',623],
    ['Fire in Single Family Res',601],
    ['Electrical Problem',597],
    ['Rubbish Fire',597],
    ['Brush Fire',574],
    ['Bark Fire',451],
    ['Rescue Heavy',423],
    ['Quick Dispatch Medic 7',405]
    ]);

    // Set chart options
    var options = {
      'title':'The Fire 911 Call Category Distribution ( > 500 calls)',
      'legend': { 'position': 'none' },
      'chartArea': {'width': '60%', 'height': '90%'},
      'height': 700
    };

    // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.BarChart(document.getElementById('categorybarchart'));
    chart.draw(data, options);
  }

  function drawIntervalLineChart() {

    var data = google.visualization.arrayToDataTable([
      ['Interval', 'Jan', 'Feb', 'Mar', 'Apri', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
      ['1 minute', 14.36, 14.79, 15.54, 15.12, 16.56, 16.83, 30.97, 26.54, 37.98, 41.06, 15.55, 14.37],
      ['2 minutes', 23.43, 23.55, 23.11, 22.71, 23.65, 24.39, 22.93, 23.92, 19.39, 18.34, 23.01, 23.42],
      ['3 minutes', 17.15, 16.44, 16.76, 16.82, 16.76, 17.00, 12.99, 14.59, 12.16, 10.82, 16.27, 16.89],
      ['4 minutes', 11.67, 11.91, 11.76, 11.94, 11.60, 11.57, 9.28, 9.70, 8.05, 7.43, 11.86, 11.81],
      ['5 minutes', 8.66, 8.62, 8.56, 8.79, 8.53, 8.60, 6.29, 6.77, 5.84, 5.49, 8.73, 8.75],
      ['6 minutes', 6.23, 6.56, 6.24, 6.21, 6.14, 5.76, 4.50, 4.86, 4.16, 4.17, 6.20, 6.34],
      ['7 minutes', 4.55, 4.53, 4.72, 4.74, 4.42, 4.18, 3.17, 3.49, 2.91, 2.85, 4.64, 4.72],
      ['8 minutes', 3.59, 3.42, 3.27, 3.37, 3.35, 3.10, 2.26, 2.41, 2.05, 2.21, 3.24, 3.48],
      ['9 minutes', 2.47, 2.39, 2.26, 2.58, 2.33, 2.12, 1.65, 1.89, 1.47, 1.55, 2.54, 2.45],
      ['10 minutes', 2.05, 1.95, 1.82, 1.91, 1.56, 1.57, 1.21, 1.27, 1.10, 1.25, 1.94, 2.02],
      ['11 minutes', 1.42, 1.38, 1.27, 1.26, 1.37, 1.22, 0.83, 0.93, 0.83, 0.88, 1.39, 1.34],
      ['12 minutes', 1.02, 1.01, 1.10, 0.97, 0.85, 0.78, 0.55, 0.62, 0.62, 0.63, 1.05, 1.02],
      ['13 minutes', 0.70, 0.78, 0.80, 0.84, 0.66, 0.61, 0.40, 0.40, 0.45, 0.51, 0.79, 0.72],
      ['14 minutes', 0.51, 0.60, 0.53, 0.62, 0.51, 0.53, 0.35, 0.31, 0.26, 0.37, 0.58, 0.54],
      ['15 minutes', 0.47, 0.40, 0.50, 0.38, 0.31, 0.38, 0.27, 0.23, 0.23, 0.26, 0.39, 0.43],
      ['16 minutes', 0.27, 0.27, 0.33, 0.28, 0.27, 0.22, 0.16, 0.16, 0.16, 0.22, 0.27, 0.31]
      ]);

      // Set chart options
      var options = {
        'title':'The Fire 911 Call Interval Distribution (first 16 minutes)',
        'legend': { 'position': 'none' },
        'chartArea': {'width': '90%', 'height': '55%'},
        height: 500,
        curveType: 'function',
        hAxis: {slantedText: true},
        legend: {position: 'top', maxLines: 2}
      };

      // Instantiate and draw our chart, passing in some options.
      var chart = new google.visualization.LineChart(document.getElementById('intervallinechart'));
      chart.draw(data, options);
    }

    function drawIntervalLineChartCategory() {

      var data = google.visualization.arrayToDataTable([
        ['Interval', 'Aid Response', 'Medic Aid', 'Auto Fire Alarm', 'Trans to AMR', 'Motor Vehicle Accident', 'Aid Response Yellow'],
        ['1 minute', 15.25, 9.63, 6.02, 4.38, 5.46, 4.75],
        ['2 minutes', 15.16, 6.42, 3.25, 1.40, 1.70, 1.16],
        ['3 minutes', 11.40, 5.30, 2.46, 1.47, 1.44, 1.02],
        ['4 minutes', 9.08, 4.50, 2.11, 1.07, 1.14, 1.07],
        ['5 minutes', 7.58, 4.06, 1.98, 1.47, 1.01, 0.68],
        ['6 minutes', 6.34, 3.71, 1.84, 1.28, 1.21, 0.87],
        ['7 minutes', 5.25, 3.47, 1.76, 1.20, 1.16, 0.78],
        ['8 minutes', 4.45, 3.44, 1.70, 1.06, 0.99, 0.90],
        ['9 minutes', 3.76, 3.06, 1.59, 1.06, 0.94, 0.78],
        ['10 minutes', 3.11, 2.82, 1.39, 1.13, 1.03, 0.99],
        ['11 minutes', 2.72, 2.79, 1.56, 1.06, 0.92, 0.68],
        ['12 minutes', 2.20, 2.60, 1.25, 0.96, 0.94, 0.71],
        ['13 minutes', 1.83, 2.42, 1.34, 0.91, 0.99, 0.70],
        ['14 minutes', 1.60, 2.32, 1.36, 1.11, 0.72, 0.62],
        ['15 minutes', 1.36, 2.19, 1.38, 1.05, 0.70, 0.54],
        ['16 minutes', 1.09, 1.98, 1.18, 1.02, 0.74, 0.70]
        ]);

        var options = {
          title: 'The Fire 911 Call Interval Distribution of Top 6 Category (first 16 minutes)',
          legend: {'position': 'none'},
          'chartArea': {'width': '90%', 'height': '55%'},
          height: 500,
          curveType: 'function',
          hAxis: {slantedText: true},
          legend: {position: 'top', maxLines: 2}
        };

        var chart = new google.visualization.LineChart(document.getElementById('intervallinechartcategory'));
        chart.draw(data, options);
      }

      function drawCategoryBarPoliceChart() {

        var data = google.visualization.arrayToDataTable([
          ['Category', 'Number'],
          ['SUSPICIOUS CIRCUMSTANCES', 161262],
          ['TRAFFIC RELATED CALLS', 157149],
          ['DISTURBANCES', 123103],
          ['PARKING VIOLATIONS', 74278],
          ['LIQUOR VIOLATIONS', 57597],
          ['THEFT', 55427],
          ['BURGLARY ALARMS (FALSE)', 33309],
          ['CAR PROWL', 33279],
          ['MENTAL CALL', 25004],
          ['TRESPASS', 23153],
          ['NUISANCE, MISCHIEF COMPLAINTS', 22993],
          ['NARCOTICS COMPLAINTS', 22487],
          ['RESIDENTIAL BURGLARIES', 22171],
          ['PROPERTY DAMAGE', 17561],
          ['WARRANT CALLS', 16853],
          ['ASSAULTS', 16029],
          ['AUTO THEFTS', 14893],
          ['FRAUD CALLS', 12263],
          ['THREATS, HARASSMENT', 10895],
          ['PROPERTY - MISSING, FOUND', 10234],
          ['HAZARDS', 10142],
          ['CASUALTIES', 7767],
          ['COMMERCIAL BURGLARIES', 6429],
          ['AUTO RECOVERIES', 5980],
          ['NOISE DISTURBANCE', 5714],
          ['PERSONS - LOST, FOUND, MISSING', 4895],
          ['GUN CALLS', 4493],
          ['ROBBERY', 4036],
          ['MISCELLANEOUS MISDEMEANORS', 4005],
          ['PANIC ALARMS (FALSE)', 3999],
          ['VICE CALLS', 3506],
          ['PARKS EXCLUSIONS', 2981],
          ['ANIMAL COMPLAINTS', 2723],
          ['PROWLER', 1333],
          ['VEHICLE ALARMS (FALSE)', 974]
          ]);

          // Set chart options
          var options = {
            'title':'The Police 911 Call Category Distribution ( > 1000 calls)',
            'legend': { 'position': 'none' },
            'chartArea': {'width': '50%', 'height': '90%'},
            'height': 700
          };

          // Instantiate and draw our chart, passing in some options.
          var chart = new google.visualization.BarChart(document.getElementById('categorybarchartpolice'));
          chart.draw(data, options);
        }

        function drawIntervalLinePoliceChart() {

          var data = google.visualization.arrayToDataTable([
            ['Interval', 'Jan', 'Feb', 'Mar', 'Apri', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
            ['1 minute', 23.17542526,23.61323679,22.82372439,24.54795597,25.07007783,26.24986113,26.87254869,26.3361812,25.56204052,24.53026227,23.67344969,21.49920004],
            ['2 minutes', 31.11992778,31.37242293,31.32369722,32.25084664,32.66125016,33.46711477,33.85028601,33.62209418,33.06942948,32.16746506,31.62249858,30.0561282],
            ['3 minutes', 17.60310748,17.21862822,17.36265826,17.42712869,17.4034918,17.07032552,17.12574312,17.10411286,17.35470172,17.49677363,17.21771227,17.57153723],
            ['4 minutes', 10.28105103,10.08063998,10.16682063,9.799830672,9.72267676,9.346183757,9.228729083,9.32346513,9.691531247,10.0597152,10.00084436,10.76009127],
            ['5 minutes', 6.403829706,6.271140663,6.293810792,5.799467828,5.624724313,5.248027997,4.977355225,5.314921518,5.54731597,5.809655052,6.127643149,6.671125449],
            ['6 minutes', 3.814263993,3.868661016,4.065913166,3.505986938,3.369427567,3.139928897,2.984839801,3.100536459,3.116697432,3.449482687,3.791177641,4.387966533],
            ['7 minutes', 2.539674998,2.58639538,2.613704287,2.299528302,2.11016093,1.951172092,1.767753391,1.845817604,1.938733048,2.138154297,2.371446148,2.812967189],
            ['8 minutes', 1.676090468,1.608941134,1.715752866,1.384857281,1.330411645,1.202644151,1.076610139,1.152394198,1.245185177,1.409760045,1.698370385,1.854328953],
            ['9 minutes', 1.023947543,1.086774787,1.132967451,0.982704403,0.82528209,0.742973003,0.703505164,0.709318498,0.779974605,0.946037579,1.091637215,1.209116899],
            ['10 minutes', 0.700845766,0.679073476,0.748519263,0.634978229,0.577697463,0.483279636,0.421428812,0.469898669,0.551637306,0.680272109,0.747861959,0.942901356],
            ['11 minutes', 0.515537394,0.481010379,0.510786285,0.436925496,0.406949444,0.354127319,0.332647809,0.324855951,0.357443903,0.381696087,0.496966334,0.634720802],
            ['12 minutes', 0.327853274,0.363973094,0.376297343,0.288763909,0.287425831,0.240251083,0.210152501,0.22153785,0.252878224,0.288732856,0.364281148,0.452435282],
            ['13 minutes', 0.239950584,0.231502321,0.25131772,0.195029028,0.189245721,0.179146761,0.160704854,0.174846016,0.173920466,0.223111753,0.247276938,0.406536051],
            ['14 minutes', 0.191247743,0.204493717,0.220072814,0.14967344,0.132329714,0.111098767,0.104514345,0.10927876,0.151513535,0.158584334,0.203852695,0.245233037],
            ['15 minutes', 0.165114511,0.159479377,0.161658425,0.131531205,0.132329714,0.070825464,0.080914332,0.079475462,0.091761718,0.114836932,0.142335018,0.215070685],
            ['16 minutes', 0.127102537,0.102889921,0.138564365,0.089199323,0.09106561,0.073602933,0.055066698,0.055632823,0.06828779,0.071089529,0.110973065,0.16654864]
            ]);

            // Set chart options
            var options = {
              'title':'The Police 911 Call Interval Distribution (first 16 minutes)',
              'legend': { 'position': 'none' },
              'chartArea': {'width': '90%', 'height': '55%'},
              height: 500,
              curveType: 'function',
              hAxis: {slantedText: true},
              legend: {position: 'top', maxLines: 2}
            };

            // Instantiate and draw our chart, passing in some options.
            var chart = new google.visualization.LineChart(document.getElementById('intervallinepolicechart'));
            chart.draw(data, options);
          }

          function drawIntervalLinePoliceChartCategory() {

            var data = google.visualization.arrayToDataTable([
              ['Interval', 'SUSPICIOUS CIRCUMSTANCES', 'TRAFFIC RELATED CALLS', 'DISTURBANCES', 'PARKING VIOLATIONS', 'LIQUOR VIOLATIONS', 'THEFTS'],
              ['1 minute', 24.25915572,25.51848832,26.02969592,31.44047619,41.0014076,25.74226644],
              ['2 minutes', 32.73343584,32.86063743,32.85365606,29.42857143,29.33842751,33.79449712],
              ['3 minutes', 17.11280403,16.81142979,17.05990034,14.88095238,12.12547758,17.14596611],
              ['4 minutes', 10.10273973,9.288474492,9.285060511,8.988095238,7.058113815,9.451266905],
              ['5 minutes', 5.636706737,5.668805616,5.517136174,5.142857143,3.82063141,5.160889165],
              ['6 minutes', 3.403690243,3.375048747,3.422149903,3.607142857,2.634224814,3.559769936],
              ['7 minutes', 2.128180039,2.258304676,2.039052171,2.261904762,1.488035391,1.958650707],
              ['8 minutes', 1.509644954,1.386180735,1.154276416,1.464285714,0.985320732,1.305767138],
              ['9 minutes', 0.98196813,0.896940476,0.945794773,0.857142857,0.542931832,0.74615265],
              ['10 minutes', 0.737349734,0.58496118,0.559340995,0.511904762,0.341845968,0.357531478],
              ['11 minutes', 0.461280403,0.428971532,0.38136886,0.464285714,0.100542932,0.170993316],
              ['12 minutes', 0.283058429,0.372248024,0.274585579,0.297619048,0.160868691,0.155448469],
              ['13 minutes', 0.248112944,0.19498706,0.147462626,0.226190476,0.160868691,0.24871755],
              ['14 minutes', 0.146771037,0.159534867,0.147462626,0.214285714,0.201085864,0.124358775],
              ['15 minutes', 0.143276489,0.116992236,0.106783281,0.107142857,0,0.062179388],
              ['16 minutes', 0.111825552,0.077994824,0.076273772,0.107142857,0.040217173,0.015544847]
              ]);

              var options = {
                title: 'The Police 911 Call Interval Distribution of Top 6 Category (first 16 minutes)',
                legend: {'position': 'none'},
                'chartArea': {'width': '90%', 'height': '55%'},
                height: 500,
                curveType: 'function',
                hAxis: {slantedText: true},
                legend: {position: 'top', maxLines: 2}
              };

              var chart = new google.visualization.LineChart(document.getElementById('intervallinechartcategorypolice'));
              chart.draw(data, options);
            }

/*
--- Node ---
install node
cron - * * * * * /usr/bin/flock -w 5 /var/tmp/infinity.lock /usr/local/bin/node /home/pi/infinity.js
set timezone

*/

var pixel = require("node-pixel");			// https://github.com/ajfisher/node-pixel
// Only first line below required for library.  (Second and third lines are to install the firmware on the arduino (Works on windows only))
// npm install node-pixel
// npm install -g nodebots-interchange
// interchange install git+https://github.com/ajfisher/node-pixel -a uno --firmata

var firmata = require('firmata');
// npm install firmata@0.14.2

var Rainbow = require('rainbowvis.js');		// https://github.com/anomal/RainbowVis-JS
// npm install rainbowvis.js

var mysql = require('mysql');
// npm install mysql

var events = require('events');
var dns = require('dns');

var online = false;

// catching all exceptions - poor but meh
process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err);
	process.exit(1);
});

function check_online()
{
	dns.resolve('www.example.com', function(err) {
		if (err)
		{
			online = false;
		} 
		else 
		{
			online = true;
		};
	});
}
check_online();
console.log("Online Status: " + online);

//var board = new firmata.Board('COM3',function(){
var board = new firmata.Board('/dev/ttyACM0',function(){

    strip = new pixel.Strip({
        pin: 6,
        length: 108,
        firmata: board,
        controller: "FIRMATA",
    });

	var call_type = 'off';
	var fps = 0;
	var colour_1 = '#000000'
	var colour_2 = '#000000'
	var length = 0;
	
	var offline_single_run = false;
	
	if (online)
	{
		var connection = mysql.createConnection({
			host     : 'SERVER',
			user     : 'USERNAME',
			password : 'PASSWORD',
			database : 'DATABASE'
		});
		connection.connect();
	}
	
	var gradient_class = new Rainbow();
	
	
	var current_interval;
	var current_call;
	
	var eventEmitter = new events.EventEmitter();
	
    strip.on("ready", function() {
        // do stuff with the strip here.
		console.log("Strip ready, let's go");
		main();
    });
	
	function main()
	{

		/*
		// ALL CURRENT FUNCTIONS
		current_call = function() {alternatingColour(20, "#0000FF", "#FFA500", 3);}
		current_call = function() {double_snake(80, "#FF0000", "#0000FF", 30);}
		current_call = function() {expand_from_middle( 30, "#FF0000", "#0000FF", 10);}  			
		current_call = function() {fill_up( 80, "#FF0000");}
		current_call = function() {travel_pulse( 60, "#0000FF", 5 );} 								// fps limited to 60, length limited to 7
		current_call = function() {clock();}
		current_call = function() {multiple_fill_slow("#22AA11");}
		current_call = function() {loading( 70, "#1188FF" );}
		current_call = function() {moving_rainbow( 40 );}
		current_call = function() {off();}
				
		current_call();
		*/
		
		//current_call = function() {expand_from_middle( 30, "#FF0000", "#0000FF", 10);}
		//current_call();
		
		setInterval(function(){
			check_online();
			console.log("Online Status: " + online);
			if (online)
			{
				connection.query('INSERT INTO status (status, time) values (\'online\', UNIX_TIMESTAMP())', function(err, result) {
				  // Done
				});
				
				connection.query('SELECT * from data order by id desc limit 1', function (error, results, fields) {
					if (error) 
					{
						process.exit(1);
						throw error;
					}
					
					new_call_type = results[0].type;
					new_fps = results[0].fps;
					new_colour_1 = results[0].colour1;
					new_colour_2 = results[0].colour2;
					new_length = results[0].length;
					
					if (call_type != new_call_type || fps != new_fps || colour_1 != new_colour_1 || colour_2 != new_colour_2 || length != new_length)
					{
						call_type = new_call_type;
						fps = parseInt(new_fps);
						colour_1 = new_colour_1;
						colour_2 = new_colour_2;
						length = parseInt(new_length);
						
						clearInterval(current_interval);
						
						switch (call_type) {
							case 'alternatingColour':
								current_call = function() {alternatingColour(fps, colour_1, colour_2, length);}
								break;
							case 'double_snake':
								current_call = function() {double_snake(fps, colour_1, colour_2, length);}
								break;
							case 'expand_from_middle':
								current_call = function() {expand_from_middle( fps, colour_1, colour_2, length);}
								break;
							case 'fill_up':
								current_call = function() {fill_up( fps, colour_1);}
								break;
							case 'travel_pulse':
								current_call = function() {travel_pulse( fps, colour_1, length );}
								break;
							case 'clock':
								current_call = function() {clock();}
								break;
							case 'multiple_fill_slow':
								current_call = function() {multiple_fill_slow( colour_1 );}
								break;
							case 'loading':
								current_call = function() {loading( fps, colour_1 );}
								break;
							case 'moving_rainbow':
								current_call = function() {moving_rainbow( fps );}
								break;
							case 'off':
								current_call = function() {off();}
								break;
							default:
								current_call = function() {off();}
						}

						eventEmitter.emit('currentFunc');
					}
				});	
			}
			else if (offline_single_run == false)
			{
				clearInterval(current_interval);
				offline_single_run = true
				current_call = function() {moving_rainbow( 50 );}
				eventEmitter.emit('currentFunc');
			}
		}, 6000);
	
	}
	
	var currentLedFunction = function currentLedFunction() {
		setTimeout(function() { current_call(); }, 2000);
	}
	eventEmitter.on('currentFunc', currentLedFunction);
	
	function moving_rainbow( delay ){
        console.log( 'rainbow' );
		stripClear();
		
		index = 0
		
		for(var i=0; i< strip.length; i++)
        {
            strip.pixel( i ).color(colorWheel(((i * 256 / strip.length) + index) & 255));
        }
        strip.show();
		
		current_interval = setInterval(function(){
			strip.shift(1, pixel.FORWARD, true);
			strip.show();
		}, 1000/delay);
    }
	
	function loading( delay, colour ){
        console.log( 'travel_fade' );
		stripClear();
		
		var pad = "000000"
		
		gradient_steps = strip.length
		gradient = generateGradientSteps(colour.substring(1), "000000", gradient_steps)
	
		current_color = colour
		
		for(var i = 0; i < strip.length; i++) {
			mapped_value = Math.round(map(i, 0, strip.length, 0, 100))
			current_color = "#" + pad.substring(0, pad.length - gradient[mapped_value]['value'].length) + gradient[mapped_value]['value']
			strip.pixel( i ).color( current_color );
		}
		strip.show();
		
		setTimeout(function() {
			current_interval = setInterval(function(){
				strip.shift(1, pixel.BACKWARD, true);
				strip.show();
			}, 1000/delay);
		}, 2000);
    }
	
	function multiple_fill_slow( colour ){
        console.log( 'multiple_fill_slow' );
		stripClear();
		
		factors = calculate_factors(strip.length)
		
		times_moved = 0
		current_factor_index = 1;
		num_factor_pairs = factors.length/2
		
        current_interval = setInterval(function(){
			if (current_factor_index < num_factor_pairs)
			{
				current_factor = factors[current_factor_index]
				current_factor_compliment = factors[(factors.length-1)-current_factor_index]
				
				if (times_moved <= current_factor_compliment)
				{
					for (var i = 0; i < current_factor; i++)
					{
						current_starting_point = (i * current_factor_compliment) + times_moved
						if (current_starting_point >= 0 && current_starting_point < strip.length)
						{
							strip.pixel( current_starting_point ).color( colour );
						}
					}
					times_moved++
				}
				else
				{
					current_factor_index++
					times_moved = 0
					stripClear();
				}

				strip.show();
			}
			else
			{
				current_factor_index = 0;
				stripClear();
			}
        }, 1000/10);
    }
	
	function clock(){
        console.log( 'clock' );
		stripClear();

		hour_location = 0
		minute_location = 0
		second_location = 0
		
		current_interval = setInterval(function(){
		
			previous_hour_location = hour_location
			previous_minute_location = minute_location
			previous_second_location = second_location
		
			d = new Date();
			hour_value = (d.getHours() + 24) % 12 || 12;
			minute_value = d.getMinutes()
			second_value = d.getSeconds()
			
			hour_divisions = strip.length / 12;
			hour_location = (hour_value * hour_divisions) - 1;
			hour_location = map(hour_location, 0, strip.length-1, strip.length-1, 0);
			
			//hour_location = Math.round(map(hour_value, 1, 12, strip.length-1, 0));
			minute_location = Math.round(map(minute_value, 0, 59, strip.length-1, 0));
			second_location = Math.round(map(second_value, 0, 59, strip.length-1, 0));
					
			strip.pixel( second_location ).color( "#0000FF" );
			strip.pixel( minute_location ).color( "#00FF00" );
			strip.pixel( hour_location ).color( "#FF0000" );
			
			if (previous_hour_location != hour_location) {
				strip.pixel( previous_hour_location ).color( "#000000" );
			}
			if (previous_minute_location != minute_location && previous_minute_location != hour_location) {
				strip.pixel( previous_minute_location ).color( "#000000" );
			}
			if (previous_second_location != second_location && previous_second_location != minute_location && previous_second_location != hour_location) {
				strip.pixel( previous_second_location ).color( "#000000" );
			}
						
			strip.show();
		}, 1000);
    }
	
	function map(value, in_min, in_max, out_min, out_max) {
		return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	}
	
	function off() {
		console.log( 'off' );
		stripClear();
		strip.show();
	}
	
	function travel_pulse( delay, colour, length ){
		if (delay > 60) { delay = 60; }
		if (length > 7) { length = 7; }
        console.log( 'travel_pulse' );
		stripClear();
		for(var i = 0; i < strip.length; i++) {
			strip.pixel( i ).color( colour );
		}
		strip.show();
		
		gradient_steps = length
		gradient = generateGradientSteps(colour.substring(1), "FFFFFF", gradient_steps)
		
		pulse_location = 0;
		
		setTimeout(function() {
			current_interval = setInterval(function(){
				if (pulse_location >= (strip.length-1))
				{
					pulse_location = 0;
				}
				else
				{
					pulse_location++;
				}
				
				for(var i = 0; i < gradient_steps+2; i++) {
					if (pulse_location+i >= 0 && pulse_location+i < strip.length)
					{
						strip.pixel( pulse_location+i ).color( "#" + gradient[i]['value'] );
					}
					else if (pulse_location+i > strip.length)
					{
						strip.pixel( (pulse_location+i) - strip.length ).color( "#" + gradient[i]['value'] );
					}
				}
				strip.show();
			}, 1000/delay);
		}, 2000);
    }
	
	function fill_up( delay, colour){
        console.log( 'fill_up' );
		stripClear();
		
		times_around = 0;
		moving_pixel_location = 0;
		
        current_interval = setInterval(function(){
			if (times_around != strip.length-1) 
			{
				strip.pixel( moving_pixel_location ).color( colour );
				
				if (moving_pixel_location-1 >= 0) {
					strip.pixel( moving_pixel_location-1 ).color( "#000000" );
				}
				if (moving_pixel_location-2 >= 0) {
					strip.pixel( moving_pixel_location-2 ).color( "#000000" );
				}
				
				if (moving_pixel_location >= (strip.length-1)-times_around)
				{
					moving_pixel_location = 0;
					times_around++;
				}
				else
				{
					moving_pixel_location++;
				}

				strip.show();
			}
			else
			{
				times_around = 0;
				stripClear();
			}
        }, 1000/delay);
    }
	
	function expand_from_middle( delay, colour1, colour2, length){
        console.log( 'expand' );
		stripClear();
		
		starting_point = strip.length/2;
		
		loop_length = (strip.length/2)
		current_loop_count = 0;
		
        current_interval = setInterval(function(){
			if (current_loop_count < (loop_length+length)) {
			
				forward_condition = (starting_point + current_loop_count)
				backward_condition = (starting_point - current_loop_count)

				if (starting_point < forward_condition && forward_condition < (starting_point + loop_length)) {
					strip.pixel( forward_condition ).color( colour1 );
				}
				
				if (starting_point >= backward_condition && backward_condition > (starting_point - loop_length)) {
					strip.pixel( backward_condition ).color( colour2 );
				}
				
				if (starting_point < forward_condition - length && forward_condition - length < (starting_point + loop_length)) {
					strip.pixel( forward_condition - length ).color( "#000000" );
				}
				
				if (starting_point >= backward_condition + length && backward_condition + length > (starting_point - loop_length)) {
					strip.pixel( backward_condition + length ).color( "#000000" );
				}

				strip.show();
				current_loop_count++;
			}
			else {
				current_loop_count = 0;
			}
        }, 1000/delay);
    }
		
	function double_snake( delay, colour1, colour2, length){
        console.log( 'doubleSnake' );
		stripClear();
		for(var i = 0; i < length && i < strip.length/2; i++) {
			strip.pixel( i ).color( colour1 );
		}
		for(var i = (strip.length/2)+1; i < (length+(strip.length/2)+1) && i < strip.length; i++) {
			strip.pixel( i ).color( colour2 );
		}
		strip.show();
		
        current_interval = setInterval(function(){
			strip.shift(1, pixel.FORWARD, true);
            strip.show();
        }, 1000/delay);
    }
	
	function alternatingColour( delay, colour1, colour2, gap){
        console.log( 'alternatingColour' );
		stripClear();
		for(var i = 0; i < strip.length; i++) {
			if (i%(gap*2) == 0)	
			{
				strip.pixel( i ).color( colour1 );
			}
			else if ((i%(gap*2) != 0) && ((i-gap)%(gap*2) == 0))
			{
				strip.pixel( i ).color( colour2 );
			}
		}
		strip.show();
		
        current_interval = setInterval(function(){
			strip.shift(1, pixel.FORWARD, true);
            strip.show();
        }, 1000/delay);
    }
	
	function stripClear() {
		for(var i = 0; i < strip.length; i++) {
			strip.pixel( i ).color( "#000000" );
		}
	}
	
	function notification(times, delay, colour1, colour2, gap) {
		if(times < 1) 
		{
			eventEmitter.emit('currentFunc');
			return;
		}

		setTimeout(function() {

			console.log( 'notification' );
			strip.off();
			if (gap <= 2)
			{
				gap = 3;
			}
			if (times%2 == 0)	
			{
				strip.off();
			}
			else
			{
				for(var i = 0; i < strip.length; i++) 
				{
					if (i%(gap*2) == 0)	
					{
						strip.pixel( i ).color( colour1 );
						strip.pixel( i+2 ).color( colour2 );
					}
				}
			}
			strip.show();

			notification(times-1, delay, colour1, colour2, gap);
		}, 1000/delay);
	}
	
	function flash(delay, colour1, colour2, gap){
        console.log( 'flash' );
		strip.clear();
		if (gap <= 2)
		{
			gap = 3;
		}
		for(var i = 0; i < strip.length; i++) {
			if (i%(gap*2) == 0)	
			{
				strip.pixel( i ).color( colour1 );
				strip.pixel( i+2 ).color( colour2 );
			}
		}
		strip.show();
		
		var counter = 0;
		current_interval = setInterval(function(){
			if (counter%2 == 0)	
			{
				strip.off();
				strip.show();
			}
			else
			{
				for(var i = 0; i < strip.length; i++) 
				{
					if (i%(gap*2) == 0)	
					{
						strip.pixel( i ).color( colour1 );
						strip.pixel( i+2 ).color( colour2 );
					}
				}
				strip.show();
			}
			counter = counter + 1;
        }, 1000/delay);
    }
	
	function dynamicRainbow( delay ){
        console.log( 'dynamicRainbow' );

        var showColor;
        var cwi = 0; // colour wheel index (current position on colour wheel)
        current_interval = setInterval(function(){
            if (++cwi > 255) {
                cwi = 0;
            }

            for(var i = 0; i < strip.length; i++) {
                showColor = colorWheel( ( cwi+i ) & 255 );
                strip.pixel( i ).color( showColor );
            }
            strip.show();
        }, 1000/delay);
    }

    // Input a value 0 to 255 to get a color value.
    // The colors are a transition r - g - b - back to r.
    function colorWheel( WheelPos ){
        var r,g,b;
        WheelPos = 255 - WheelPos;

        if ( WheelPos < 85 ) {
            r = 255 - WheelPos * 3;
            g = 0;
            b = WheelPos * 3;
        } else if (WheelPos < 170) {
            WheelPos -= 85;
            r = 0;
            g = WheelPos * 3;
            b = 255 - WheelPos * 3;
        } else {
            WheelPos -= 170;
            r = WheelPos * 3;
            g = 255 - WheelPos * 3;
            b = 0;
        }
        // returns a string with the rgb value to be used as the parameter
        return "rgb(" + r +"," + g + "," + b + ")";
    }
		
	function generateGradientSteps(from, to, steps) {
		steps = steps + 2
		gradient_class.setNumberRange(1, steps);
		gradient_class.setSpectrum(from, to);
		var total = 100 / (steps + 1);
		var obj = [];
		for (var i = 1; i <= steps; i++) {
			obj.push({percentage: Math.floor(total * i), value: gradient_class.colourAt(i)});
		}
		return obj
	};
	
	function calculate_factors(num) {
		var nums = [1]
		var half = Math.floor(num / 2), // Ensures a whole number <= num.
			i, j;

		// Determine out increment value for the loop and starting point.
		num % 2 === 0 ? (i = 2, j = 1) : (i = 3, j = 2);

		for (i; i <= half; i += j) {
			num % i === 0 ? nums.push(i) : false;
		}

		nums.push(num);   // Always include the original number.
		return nums;
	}
});
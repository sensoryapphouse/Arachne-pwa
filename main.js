window.onload = () => {
    'use strict';
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
    c = document.getElementById('c');
    camStart();
    init();
    loop();
}
var that;

/*

4 modes.
1. Follow finger 
2. Follow finger with small trail
3. Follow finger with long trail
4. Follow finger with tail, connectionSplitsMultiplier
5. Connectionlife 60
6. Shadowblur

Buttons:
    change direction done
    number of spiders 1-5 done
    size of grid 1-4 done
    source-over/xor and maybe change colours
*/

var c,
    w,
    h,
    ctx,

    opts = {
        mode: 1,
        colours: 1,
        speed: 3,
        tickSpeed: .5, // .5 
        squareDist: 4000, // PB size of spiders/grid 1000, 2000, 3000, 4000, 6000
        particleCount: 2, // PB number of spiders

        connectionLife: 20, // PB  20, 60
        connectionSplitsMultiplier: .3, // .2 multiplier referring to life of connection
        connectionJitterMultiplier: .4, // .4  different styles, 0, .1, .4
        connectionSpacing: 25, // PB number of legs 40, 25, 15 

        particleBaseVel: 2, // PB Speed 2
        particleAddedVel: 4,
        particleBounceBaseMultiplier: -1., // -1.2
        particleBounceAddedMultiplier: 0., // .4
        direction: 1,
        legwidth: 1., // 1 or 2
    },

    tick = (Math.random() * 360) | 0,
    particles = [],
    points = [];

var mouseX = false;
var mouseY = false;
var mousedown = false;
var mousetap = false;


function init() {
    try {
        for (i = 0; i < particles.length; i++)
            delete particles[i];
    } catch (e) {};
    particles.length = 0;
    points.length = 0;
    w = c.width = 800; // window.innerWidth;
    h = c.height = 600; //window.innerHeight;
    ctx = c.getContext('2d');

    for (var i = 0; i < opts.particleCount; ++i)
        particles.push(new Particle(i));

    for (var x = 0; x < w; x += opts.connectionSpacing)
        for (var y = 0; y < h; y += opts.connectionSpacing)
            points.push(new Point(x, y));
}

function loop() {
    setTimeout(function () {
        window.requestAnimationFrame(loop);
    }, 10 * opts.speed);

    tick += opts.tickSpeed;

    ctx.globalCompositeOperation = 'source-over';
    switch (opts.mode) {
        case 1:
            ctx.fillStyle = 'rgba(0,0,0,1)';
            break;
        case 3:
            ctx.fillStyle = 'rgba(0,0,0,.1)';
            break;
        case 4:
            ctx.fillStyle = 'rgba(0,0,0,.04)';
            break;
        default:
            ctx.fillStyle = 'rgba(0,0,0,1)';
            break;
    }
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter'; // lighter

    points.map(function (point) {
        point.step();
    });
    particles.map(function (particle) {
        particle.step();
    });
}

function Point(x, y) {
    this.x = x;
    this.y = y;
    this.resets = 0;
}

Point.prototype.step = function () {
    this.y += opts.tickSpeed;
    if (this.y > h) {
        ++this.resets;
        this.y = 0;
    }

    //        ctx.fillStyle = '#111'; // 111
    // ctx.fillRect(this.x, this.y, 2, 2);
}

function Particle(i) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;

    var vel = opts.particleBaseVel + Math.random() * opts.particleAddedVel,
        rad = Math.random() * Math.PI * 2;

    this.vx = Math.cos(rad) * vel;
    this.vy = Math.sin(rad) * vel;

    this.connections = [];
    this.connectionLives = [];
    this.connectionResets = [];
    this.id = i;
}

function scaleMouseX() {
    return mouseX * w / window.innerWidth;
}

function scaleMouseY() {
    return mouseY * h / window.innerHeight;
}

Particle.prototype.step = function () {

    // basic physics and bounces
    this.x += this.vx;
    this.y += this.vy;
    if (mousedown) {
        var hyp = Math.hypot(scaleMouseX() - this.x, scaleMouseY() - this.y) / 4;
        var root = Math.sqrt(hyp);
        if (mousetap) {
            this.vx = (this.vx * 2 + opts.direction * (scaleMouseX() - this.x) / hyp) / 3; // PB speed of attraction to mouse
            this.vy = (this.vy * 2 + opts.direction * (scaleMouseY() - this.y) / hyp) / 3;
        } else {
            this.vx = (this.vx * 7 + (opts.direction * (scaleMouseX() - this.x) / root) * (Math.random() + 1) / 12) / 8; // PB speed of attraction to mouse
            this.vy = (this.vy * 7 + (opts.direction * (scaleMouseY() - this.y) / root) * (Math.random() + 1) / 8) / 8;
        }
    }
    if (this.x < 0 || this.x > w)
        this.vx *= opts.particleBounceBaseMultiplier + Math.random() * opts.particleBounceAddedMultiplier;

    if (this.y < 0 || this.y > h)
        this.vy *= opts.particleBounceBaseMultiplier + Math.random() * opts.particleBounceAddedMultiplier;

    // create connections
    // crazily inefficient, but I'm crazily lazy... so... :P
    for (var i = 0; i < points.length; ++i) {

        var point = points[i],
            dx = point.x - this.x,
            dy = point.y - this.y;

        if (dx * dx + dy * dy < opts.squareDist) {
            var index = this.connections.indexOf(point);

            if (index === -1) {
                this.connections.push(point);
                this.connectionLives.push(opts.connectionLife);
                this.connectionResets.push(point.resets);
            } else {
                this.connectionLives[index] = opts.connectionLife;
            }
        }
    }

    for (var i = 0; i < this.connectionLives.length; ++i) {

        --this.connectionLives[i];

        if (this.connectionLives[i] < 0 ||
            this.connectionResets[i] !== this.connections[i].resets) {

            this.connectionLives.splice(i, 1);
            this.connections.splice(i, 1);
            this.connectionResets.splice(i, 1);
            --i;
        }
    }

    for (var i = 0; i < this.connections.length; ++i) {
        var point = this.connections[i],
            life = this.connectionLives[i],
            splits = (opts.connectionSplitsMultiplier * life) | 0,
            jitter = opts.connectionJitterMultiplier * life,
            dx = this.x - point.x,
            dy = this.y - point.y,
            sdx = dx / splits, // split version of dx
            sdy = dy / splits,
            lw = (life / opts.connectionLife) * 3, // lineWidth
            slw = opts.legwidth * lw / splits, // split version of lw

            x = point.x + Math.random() * jitter,
            y = point.y + Math.random() * jitter;

        for (var j = 0; j < splits; ++j) {

            ctx.beginPath();
            if (opts.mode > 5) {
                ctx.shadowColor = 'white';
                ctx.shadowBlur = 8;
                ctx.lineWidth = 2 * slw * j;
                //                ctx.shadowOffsetX = 1;//                ctx.shadowOffsetY = 1;
            } else
                ctx.lineWidth = slw * j;
            //            if (this.id == 0)

            ctx.moveTo(x, y);

            x = point.x + sdx * j + Math.random() * jitter;
            y = point.y + sdy * j + Math.random() * jitter;

            ctx.lineTo(x, y);
            switch (opts.colours) {
                case 1:
                    ctx.strokeStyle = 'hsl(hue,100%,50%)'.replace('hue', y / h * 360 + tick);
                    ctx.globalCompositeOperation = 'source-over';
                    break;
                case 2:
                    switch (this.id) {
                        case 0:
                            ctx.strokeStyle = 'red';
                            break;
                        case 1:
                            ctx.strokeStyle = 'chartreuse';
                            break;
                        case 2:
                            ctx.strokeStyle = 'red';
                            break;
                        case 3:
                            ctx.strokeStyle = 'chartreuse';
                            break;
                        case 4:
                            ctx.strokeStyle = 'red';
                            break;
                        default:
                            ctx.strokeStyle = 'red';
                            break;

                    }
                    ctx.globalCompositeOperation = 'lighter';
                    break;
                case 3:
                    switch (this.id) {
                        case 0:
                            ctx.strokeStyle = 'chartreuse';
                            break;
                        case 1:
                            ctx.strokeStyle = 'red';
                            break;
                        case 2:
                            ctx.strokeStyle = 'aqua';
                            break;
                        case 3:
                            ctx.strokeStyle = 'yellow';
                            break;
                        case 4:
                            ctx.strokeStyle = 'white';
                            break;
                        default:
                            ctx.strokeStyle = 'red';
                            break;

                    }
                    ctx.globalCompositeOperation = 'lighter';
                    break;
                case 4:
                    switch (this.id) {
                        case 0:
                            ctx.strokeStyle = 'aqua';
                            break;
                        case 1:
                            ctx.strokeStyle = 'dodgerblue';
                            break;
                        case 2:
                            ctx.strokeStyle = 'powderblue';
                            break;
                        case 3:
                            ctx.strokeStyle = 'lightskyblue';
                            break;
                        case 4:
                            ctx.strokeStyle = 'skyblue';
                            break;
                        default:
                            ctx.strokeStyle = 'lightskyblue';
                            break;

                    }
                    ctx.globalCompositeOperation = 'source-over';
                    break;
                case 5:
                    ctx.strokeStyle = 'hsl(hue,100%,50%)'.replace('hue', y / h * 360 + tick);
                    ctx.globalCompositeOperation = 'xor';
                    ctx.lineWidth *= 3;
                    break;
                default:
                    ctx.strokeStyle = 'hsl(hue,100%,50%)'.replace('hue', y / h * 360 + tick);
                    ctx.globalCompositeOperation = 'source-over';
                    break;
                    break;
            }
            ctx.stroke();
        }
    }
}
//init();
//loop();

window.addEventListener('resize', function () {

    w = c.width = 800; //window.innerWidth;
    h = c.height = 600; //window.innerHeight;
    init();
})



function camStart() {

    var splash = document.querySelector('splash');
    var crosshairs = document.querySelector('crosshairs');
    crosshairs.hidden = true;

    var mode = 0;
    var tmr;

    window.requestAnimFrame =
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 300);
        };
    var tmr = window.setTimeout(function () {
        if (document.body.requestFullscreen) {
            document.body.requestFullscreen();
        } else if (document.body.msRequestFullscreen) {
            document.body.msRequestFullscreen();
        } else if (document.body.mozRequestFullScreen) {
            document.body.mozRequestFullScreen();
        } else if (document.body.webkitRequestFullscreen) {
            document.body.webkitRequestFullscreen();
        }
        splash.hidden = true;
    }, 3000); // hide Splash screen after 2.5 seconds
    splash.onclick = function (e) {
        clearTimeout(tmr);
        if (document.body.requestFullscreen) {
            document.body.requestFullscreen();
        } else if (document.body.msRequestFullscreen) {
            document.body.msRequestFullscreen();
        } else if (document.body.mozRequestFullScreen) {
            document.body.mozRequestFullScreen();
        } else if (document.body.webkitRequestFullscreen) {
            document.body.webkitRequestFullscreen();
        }
        splash.hidden = true;
    }
    var button = document.querySelector('button');
    var button1 = document.querySelector('button1');
    var button2 = document.querySelector('button2');
    var button3 = document.querySelector('button3');
    var buttonl = document.querySelector('buttonl');
    var buttonr = document.querySelector('buttonr');

    document.onmousemove = function (e) {
        e.preventDefault();
        if (mousedown) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            mousetap = false;
        }
    }
    document.onmousedown = function (e) {
        e.preventDefault();
        mousedown = true;
        mousetap = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    }
    document.onmouseup = function (e) {
        e.preventDefault();
        mousedown = false;
        mousetap = false;
    }

    document.ontouchmove = function (e) {
        e.preventDefault();
        if (mousedown) {
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
            mousetap = false;
        }
    }
    document.ontouchstart = function (e) {
        e.preventDefault();
        mousedown = true;
        mousetap = true;
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
    }
    document.ontouchup = function (e) {
        e.preventDefault();
        mousedown = false;
        mousetap = false;
    }

    document.onkeypress = function (e) {
        //        e.preventDefault();
        if (e.repeat)
            return;
        switch (e.charCode) {
            case 32:
            case 49:
                Action(1);
                break;
            case 50:
                Action(2);
                break;
            case 51:
            case 13:
                Action(3);
                break;
            case 52:
                Action(4);
                break;
            case 53:
                toggleButtons();
                break;
            case 95: // +
                Action(5);
                break;
            case 43: // -
                Action(6);
                break;
        }
    }

    button.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        Action(1);
    }
    button1.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation()
        Action(2);
    }
    button2.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation()
        Action(3);
    }
    button3.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation()
        Action(4);
    }

    buttonl.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation()
        Action(5);
    }
    buttonr.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation()
        Action(6);
    }

    function randomClick() {
        //        mouse.x = Math.random() * 700 + 50;
        //        mouse.y = Math.random() * 300 + 50;
        //        mouse.down = true;
        setTimeout(function () {
            //            mouse.down = false;
        }, 3000);
    }

    var player;
    var player1;
    var player2;

    function PlaySound(i) {
        switch (i) {
            case 1:
                if (player == undefined) {
                    player = document.getElementById('audio');
                    player.loop = false;
                }
                player.load();
                player.play();
                break;
            case 2:
                if (player1 == undefined) {
                    player1 = document.getElementById('audio1');
                }
                player1.load();
                player1.play();
                break;
            case 3:
                if (player2 == undefined) {
                    player2 = document.getElementById('audio2');
                }
                player2.load();
                player2.play();
                break;
        }
    }

    function toggleButtons() {
        button.hidden = !button.hidden;
        button1.hidden = !button1.hidden;
        button2.hidden = !button2.hidden;
        button3.hidden = !button3.hidden;
        buttonl.hidden = !buttonl.hidden;
        buttonr.hidden = !buttonr.hidden;
    }

    function setMode() {
        if (opts.mode < 1)
            opts.mode = 6;
        if (opts.mode > 6)
            opts.mode = 1;
        switch (opts.mode) {
            case 1:
                opts.connectionSpacing = 25;
                break;
            case 2:
                opts.connectionSpacing = 15;
                break;
            case 3:
                opts.connectionSpacing = 25;
                break;
            case 4:
                opts.connectionLife = 20;
                break;
            case 5:
                opts.connectionLife = 60;
                break;
            case 6:
                opts.connectionLife = 20;
                break;
        }
    }

    var huecount = 1;

    function Action(i) { // abc
        switch (i) {
            case 1: // size
                PlaySound(2);
                switch (opts.squareDist) {
                    case 1000:
                        opts.squareDist = 2000;
                        break;
                    case 2000:
                        opts.squareDist = 3000;
                        break;
                    case 3000:
                        opts.squareDist = 4000;
                        break;
                    case 4000:
                        opts.squareDist = 6000;
                        break;
                    case 6000:
                        opts.squareDist = 8000;
                        break;
                    case 8000:
                        opts.squareDist = 1000;
                        break;
                    default:
                        opts.squareDist = 4000;
                        break;
                }
                init();
                break;
            case 2: // number of particles
                PlaySound(3);
                opts.particleCount++;
                if (opts.particleCount > 6)
                    opts.particleCount = 1;
                init();
                break;
            case 3: // change direction
                PlaySound(1);
                opts.direction = -opts.direction;
                for (o = 0; o < particles.length; o++) {
                    particles[o].vx = -particles[o].vx
                    particles[o].vy = -particles[o].vy
                }
                break;
            case 4: // button 4: colours
                PlaySound(1);
                opts.colours++;
                if (opts.colours > 4) {
                    opts.colours = 1;
                    huecount++;
                    if (huecount > 5)
                        huecount = 0;
                    c.style.filter = "hue-rotate(" + (huecount * 60) + "deg)";
                }
                init();
                break;
            case 5: // left 
                opts.mode--;
                setMode();
                init();
                break;
            case 6: // right
                opts.mode++;
                setMode();
                init();
                break;
        }
    }

    function getMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect(), // abs. size of element
            scaleX = canvas.width / rect.width, // relationship bitmap vs. element for X
            scaleY = canvas.height / rect.height; // relationship bitmap vs. element for Y

        return {
            x: (evt.clientX - rect.left) * scaleX, // scale mouse coordinates after they have
            y: (evt.clientY - rect.top) * scaleY // been adjusted to be relative to element
        }
    }

    //    var mouse;
    //    var msTimer;

    function MoveMouse(xm, ym) {
        crosshairs.hidden = false;
        try {
            mouseX = crosshairs.offsetLeft + (crosshairs.offsetWidth) / 2;
            mouseY = crosshairs.offsetTop + (crosshairs.offsetHeight) / 2;
            //            console.log('Moving: ', xm, ym);
            mouseX += xm;
            mouseY += ym;
            if (mouseX < 10)
                mouseX = 10;
            if (mouseY < 10)
                mouseY = 10;
            if (mouseX >= window.innerWidth - 10)
                mouseX = window.innerWidth - 10;
            if (mouseY >= window.innerHeight - 10)
                mouseY = window.innerHeight - 10;
            console.log('MoveTo: ', mouseX, mouseY);
            crosshairs.style.left = mouseX - crosshairs.offsetWidth / 2 + "px";
            crosshairs.style.top = mouseY - crosshairs.offsetHeight / 2 + "px";
            //            mouseX /= canvas.width;
            //            mouse.x = 800 * mouseX / window.innerWidth;//            mouse.y = 400 * mouseY / window.innerHeight;
            //           console.log("XBox", mouse.x, mouse.y);
            //            mouse.down = true;
            //            try {
            //                clearTimeout(msTimer);
            //            } catch (e) {};
            //            msTimer = setTimeout(function () {
            //                mouse.down = false;
            //            }, 1000);
        } catch {}
    }

    function JoystickMoveTo(jy, jx) {
        if (splash.hidden) {
            if (Math.abs(jx) < .1 && Math.abs(jy) < .1) {
                try {
                    if (gpad.getButton(14).value > 0) // dpad left
                        MoveMouse(-5, 0);
                    if (gpad.getButton(12).value > 0) // dup
                        MoveMouse(0, -3);
                    if (gpad.getButton(13).value > 0) // ddown
                        MoveMouse(0, 3);
                    if (gpad.getButton(15).value > 0) // dright
                        MoveMouse(5, 0);
                } catch {}
                return;
            }
            if (Math.abs(jx) < .1)
                jx = 0;
            if (Math.abs(jy) < .1)
                jy = 0;
            if (jx == 0 && jy == 0)
                return;
            MoveMouse(jx * 10, jy * 10);
        }
    }

    var currentButton = 0;


    function MouseClick() {
        var s; //        
        var elements = document.elementsFromPoint(crosshairs.offsetLeft + (crosshairs.offsetWidth) / 2, crosshairs.offsetTop + (crosshairs.offsetHeight) / 2);
        try {
            if (elements[0].id == "c") {
                mousedown = true;
                mousetap = false;
            } else {
                elements[0].click();
                mouseState = 0;
            }
        } catch (e) {}
    }

    function showPressedButton(index) {
        //      console.log("Pressed: ", index);
        if (!splash.hidden) { // splash screen
            splash.hidden = true;
        } else {
            switch (index) {
                case 0: // A
                    if (crosshairs.hidden) {
                        Action(1);
                    } else {
                        MouseClick();
                    }
                    break;
                case 8:
                    toggleButtons();
                    break
                case 9:
                    Action(5);
                    break;
                case 1: // B - 
                    Action(2);
                    break;
                case 2: // X
                    Action(3);
                    break;
                case 3: // Y
                    Action(4);
                    break;
                case 4: // LT
                case 6: //
                    Action(5);
                    break;
                case 5: // RT
                case 7: //
                    Action(6);
                    break;
                case 10: // XBox
                    break;
                case 12: // dpad handled by timer elsewhere
                case 13:
                case 14:
                case 15:
                    break;
                default:
            }
        }
    }

    function removePressedButton(index) {
        mousedown = false;
        //        console.log("Releasd: ", index);
    }

    function moveJoystick(values, isLeft) {
        if (splash.hidden)
            JoystickMoveTo(values[1], values[0]);
    }

    var gpad;

    function getAxes() {
        //       console.log('Axis', gpad.getAxis(0), gpad.getAxis(1), gpad.getButton(14).value);
        if (splash.hidden) {
            JoystickMoveTo(gpad.getAxis(1), gpad.getAxis(0));
            JoystickMoveTo(gpad.getAxis(3), gpad.getAxis(2));
        }
        setTimeout(function () {
            getAxes();
        }, 50);
    }

    gamepads.addEventListener('connect', e => {
        console.log('Gamepad connected:');
        console.log(e.gamepad);
        gpad = e.gamepad;
        e.gamepad.addEventListener('buttonpress', e => showPressedButton(e.index));
        e.gamepad.addEventListener('buttonrelease', e => removePressedButton(e.index));
        //       e.gamepad.addEventListener('joystickmove', e => moveJoystick(e.values, true),
        //            StandardMapping.Axis.JOYSTICK_LEFT);
        //        e.gamepad.addEventListener('joystickmove', e => moveJoystick(e.values, false),
        //            StandardMapping.Axis.JOYSTICK_RIGHT);
        setTimeout(function () {
            getAxes();
        }, 50);
    });

    gamepads.addEventListener('disconnect', e => {
        console.log('Gamepad disconnected:');
        console.log(e.gamepad);
    });

    gamepads.start();
}

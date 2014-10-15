Object.subclass("PlayerControls", {
    initialize: function(player, world, input, viewport) {
        this.player = player;
        this.world = world;
        this.input = input;
        this.viewport = viewport;

        // constraint:
        // - the player tanks turret follows the mouse
		var turretConstraint = bbb.always({
            solver: new DBPlanner(),
            ctx: {
                player: player,
                input: input
            },
            methods: function() {
                player.turretDirection.formula([input.position, input.position.x, input.position.y, player.position, player.position.x, player.position.y], function(mousePosition, mousePositionX, mousePositionY, playerPosition, playerPositionX, playerPositionY) {
                    return mousePosition.sub(playerPosition);
                });
            } }, function() {
                return player.turretDirection.equals((input.mouse).sub(player.position));
		});
		player.constraints.push(turretConstraint);
    },
    update: function(dt) {
        // move player tank
        player.velocity.set(Vector2.Zero);
        if(this.input.state("up")) this.player.velocity.addSelf(new Vector2(0, -1));
        if(this.input.state("left")) this.player.velocity.addSelf(new Vector2(-1, 0));
        if(this.input.state("down")) this.player.velocity.addSelf(new Vector2(0, 1));
        if(this.input.state("right")) this.player.velocity.addSelf(new Vector2(1, 0));

        // player fires a bullet
        if(this.input.pressed("leftclick")) {
            player.fireBullet(this.world, dt);
        }
    }
});

Object.subclass("CPUControls", {
    initialize: function(tank, world, input, viewport) {
        this.tank = tank;
        this.world = world;

        this.turretRotationSpeed = 45 * Math.PI / 180;
    },
    update: function(dt) {
        this.turretUpdate(dt);
        this.movementUpdate(dt);
        this.fireUpdate(dt);
    }
});

/*
Object.subclass("Line", {
    initialize: function(a, b) {
        this.a = a;
        this.b = b;
    }
});

Object.extend(Line, {
    forRay: function(pos, dir) {
        var a = dir.y / dir.x;
        var b = pos.y - a * pos.x;
        return new Line(a, b);
    }
});

Object.subclass("Ray", {
    initialize: function(pos, dir, ricochet) {

    }
});
*/

CPUControls.raycast = function(world, tank, pos, dir, color) {
    var ricochets = tank.bulletRicochets;

    function linecast(tank, pos, dir) {
        var tile = tank.getTile(pos);
        while(tile.canFlyThrough()) {
            tile.marked = color;
            pos.addSelf(dir);
            tile = tank.getTile(pos);
        }
        tile.marked = "red";
    };
    function reflect(world, pos, dir) {
        var reflectCoords = world.map.positionToCoordinates(pos);
        pos.subSelf(dir);
        var prevCoords = world.map.positionToCoordinates(pos);
        if(reflectCoords.x == prevCoords.x) {
            dir.y *= -1;
        }
        if(reflectCoords.y == prevCoords.y) {
            dir.x *= -1;
        }
    };

    linecast(tank, pos, dir);

    while(ricochets > 0) {
        ricochets--;
        reflect(world, pos, dir);
        linecast(tank, pos, dir);
    }
};

CPUControls.subclass("BrownTurret", { // Bobby
    initialize: function($super, tank, world, input, viewport) {
        $super(tank, world, input, viewport);
        this.rotationDirection = 1;
    },
    turretUpdate: function(dt) {
        if(Math.random() < 0.02) {
            this.rotationDirection *= -1;
        }
        this.tank.turretDirection.rotateSelf(this.rotationDirection * this.turretRotationSpeed * dt);
    },
    movementUpdate: function(dt) {
	    this.tank.velocity.set(Vector2.Zero);
    },
    // fire on line of sight
    fireUpdate: function(dt) {
        var world = this.world;
        var map = world.map;
        var tank = this.tank;
        var pos = tank.position.copy();
        var dir = tank.turretDirection.normalizedCopy();

        CPUControls.raycast(world, tank, pos, dir, "brown");

        if(tank.getTile(player.position).marked == "brown") {
            this.tank.fireBullet(this.world, dt);
        };
    }
});

CPUControls.subclass("GreySoldier", { // Fred
    turretUpdate: function(dt) {
        // adjust turret direction randomly
        this.tank.turretDirection.rotateSelf(Math.PI / 180 * (Math.random() - 0.5) * 50);
    },
    movementUpdate: function(dt) {
	    // adjust direction randomly
	    this.tank.velocity.rotateSelf(Math.PI / 180 * (Math.random() - 0.5) * 50);
        //this.velocity.set(player.position.sub(this.position));
    },
    fireUpdate: function(dt) {
        var angle = this.tank.turretDirection.getDirectedAngle(player.position.sub(this.tank.position));
        var sight = angle < 2 && angle > -2;
        if(sight) {
            this.tank.fireBullet(this.world, dt);
        }
    }
});

CPUControls.subclass("TealHunter", { // Luzy
    turretUpdate: function(dt) {
        // turret strongly seek the player
        this.tank.turretDirection.set(player.position.sub(this.tank.position));
    },
    movementUpdate: function(dt) {
	    // adjust direction randomly

	    // defensive movement
	    var tank = this.tank;
	    tank.velocity.set(this.world.getGameObjects()
            .filter(function(object) {
                // take only bullets
                return object.name === "bullet";
            })
            .filter(function(bullet) {
                // take only near bullets into account
                return bullet.position.distance(tank.position) < 7 * 2; // tileSize
            })
            .filter(function(bullet) {
                // take only bullets that fly towards my tank into account
                var angle = tank.position.sub(bullet.position).getDirectedAngle(bullet.velocity);
                return angle >= -90 && angle <= 90;
            })
            .map(function(bullet) {
                // use cross product of bullet direction and position difference
                var a = bullet.velocity.copy();
                var b = tank.position.sub(bullet.position);
                var cross = [a.y - b.y, b.x - a.x, a.x * b.y - a.y * b.x];
                var dir = new Vector2(cross[0], cross[1]);
                dir.divFloatSelf(cross[2]);
                return dir;
            })
            .reduce(function(prev, velocity) {
                return prev.add(velocity);
            }, Vector2.Zero.copy())
        );
    },
    fireUpdate: function(dt) {
        var world = this.world;
        var map = world.map;
        var tank = this.tank;
        var pos = tank.position.copy();
        var dir = tank.turretDirection.normalizedCopy();

        CPUControls.raycast(world, tank, pos, dir, "teal");

        if(tank.getTile(player.position).marked == "teal") {
            this.tank.fireBullet(this.world, dt);
        };
    }
});


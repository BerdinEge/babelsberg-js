Object.subclass("World", {
	initialize: function(boundary, input, viewport) {
		this.boundary = boundary;
		this.gameObjects = [];
		this.map = new Map(new Vector2(2,2),
		[[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
		 [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,1,1,1,2,2,0,0,0,0,2,2,1,1,1,1,1,1,1,1],
		 [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
		 [1,1,1,1,1,1,1,1,2,2,0,0,0,0,2,2,1,1,1,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
		 [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
		 [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]]
		);

        this.input = input;
        this.viewport = viewport;

        player = this.buildTank(
            PlayerTank,
            new Vector2(5, 12),
            Vector2.Zero.copy(),
            new Vector2(1,0.5),
            Tank.Player
        );
        this.buildTank(
            CPUTank,
            new Vector2(41, 13),
            new Vector2(-1,1),
            new Vector2(1,0.5),
            Tank.BrownTurret
        );
        this.buildTank(
            CPUTank,
            new Vector2(10, 26),
            new Vector2(-1,1),
            new Vector2(1,0.5),
            Tank.GreySoldier
        );
        this.buildTank(
            CPUTank,
            new Vector2(40, 26),
            new Vector2(-1,1),
            new Vector2(1,0.5),
            Tank.TealHunter
        );
	},

	buildTank: function(TankClass, pos, vel, dir, config) {
        var cpu = new (TankClass)(this, pos, vel, dir, config);
        cpu.controls = new (config.intelligence)(cpu, this, this.input, this.viewport);
        this.spawn(cpu);
        return cpu;
	},
	
	update: function(dt) {
		this.gameObjects.forEach(function(gameObject) {
		    gameObject.update(dt);
		});
	},
	
	draw: function(renderer) {
		this.map.draw(renderer);

		this.gameObjects.forEach(function(gameObject) {
		    gameObject.draw(renderer);
		});
	},

	spawn: function(gameObject) { this.gameObjects.push(gameObject); },
	getGameObjects: function() { return this.gameObjects; },
	remove: function(gameObject) { this.gameObjects.remove(gameObject); }
});

Object.subclass("Map", {
	initialize: function(tileSize, tiles) {
	    this.tileSize = tileSize;
		this.tiles = _.map(tiles, function(stripe) {
            return _.map(stripe, function(tileIndex) {
                return new Tile(tileIndex);
            });
        });
		this.size = new Vector2(this.tiles[0].length, this.tiles.length);
        this.spriteSheet = new AnimationSheet("assets/tileset.png", 32, 32);
	},

	draw: function(renderer) {
		_.each(this.tiles, function(stripe, y) {
            _.each(stripe, function(tile, x) {
                var min = new Vector2(x, y).mulVector(this.tileSize);
                this.spriteSheet.draw(
                    renderer,
                    new AABB(min, min.add(this.tileSize)),
                    tile.index
                );
                if(tile.marked) {
                    renderer.drawRectangle(
                        min.add(this.tileSize.mulFloat(0.5)),
                        25,
                        tile.marked,
                        1
                    );
                }
                tile.marked = false;
            }, this);
		}, this);
	},

	get: function(coords) {
	    return this.tiles[coords.y][coords.x];
	},

	positionToCoordinates: function(pos) {
        return pos
            .divVector(this.tileSize)
            .floor();
	},

	coordinatesToPosition: function(coords) {
	    return this.tiles[coords.y][coords.x];
	}
});

Object.subclass("Tile", {
	initialize: function(index) {
		this.index = index;
	},
	canWalkThrough: function() {
	    return this.index == 0;
	},
	canFlyThrough: function() {
	    return this.index != 1;
	}
});

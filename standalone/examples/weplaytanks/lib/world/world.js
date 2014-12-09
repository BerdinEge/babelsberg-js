define(["./tile", "./../levels/levels", "./config"], function WorldBuilder(Tile, Levels, TankConfig) {
    Object.subclass("LevelPointer", {
        initialize: function() {
            this.reset();
        },
        reset: function() {
            this.currentLevel = 0;
        },
        get: function() {
            return Levels[this.currentLevel];
        },
        next: function() {
            this.currentLevel++;
            return this.get();
        }
    });

    Object.subclass("World", {
        initialize: function() {
            this.gameObjects = [];
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
        },

        draw: function(renderer) {
            _.each(this.tiles, function(stripe, y) {
                _.each(stripe, function(tile, x) {
                    tile.draw(renderer, x, y, this.tileSize);
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

    return World;
});

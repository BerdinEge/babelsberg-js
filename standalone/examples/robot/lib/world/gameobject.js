Object.subclass("GameObject", {
	initialize: function(world, name, pos, extent, radius, vel, speed) {
	    this.world = world;
		this.name = name;

		this.position = pos;
        this.prevPosition = pos.copy();

        this.velocity = vel;

		this.radius = radius;
		this.extent = extent;

		this.speed = speed * world.map.tileSize.x;

		this.constraints = [];
		this.alive = true;
	},

	update: function(dt) {
	    this.prevPosition.set(this.position);

        var deltaPos = this.velocity.normalizedCopy().mulFloat(dt*this.speed);
        this.position.addSelf(deltaPos);

        this.animation.update(dt);
	},
	
	draw: function(renderer) {
		this.animation.draw(renderer, this.getWorldAABB(), this.velocity.getDirectedAngle(new Vector2(1,0)));
	},

	getTile: function(pos) {
	    return this.world.map.get(this.world.map.positionToCoordinates(pos));
	},

	getWorldAABB: function() {
        var halfSize = this.extent.divFloat(2);
        var aabb = new AABB(
            this.position.sub(halfSize),
            this.position.add(halfSize)
        );
        return aabb;
	},

    // define a callback that should be triggered when this object is colliding with a second game object
    onCollisionWith: function(other, callback) {
        var that = this;

        var onCollision = bbb.trigger({
            callback: function() {
                callback.call(this, that, other);
            },
            ctx: {
                that: that,
                other: other
            }
        }, function() {
            // use simple spheres for collision detection
            // remember: this is only the detection of a collision
            // if a collision occurs, it is solved by the given callback
            return that.position.distance(other.position) <= that.radius + other.radius;
        });

        // track this constraint on both game objects
        this.constraints.push(onCollision);
        other.constraints.push(onCollision);
    },

    destroy: function() {
        this.constraints.each(function(constraint) {
            constraint.disable();
        });
        this.alive = false;
        this.world.remove(this);
    }
});

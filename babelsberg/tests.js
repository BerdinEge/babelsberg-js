module('users.timfelgentreff.babelsberg.tests').requires('lively.TestFramework', 'users.timfelgentreff.babelsberg.constraintinterpreter', 'users.timfelgentreff.babelsberg.src_transform_test', 'users.timfelgentreff.reactive.reactive_test').toRun(function() {

TestCase.subclass('users.timfelgentreff.babelsberg.tests.ConstraintTest', {
    testSimple: function () {
        ClSimplexSolver.resetInstance();
        var obj = {a: 2, b: 3};
        (function () {
            return obj.a + obj.b == 3;
        }).shouldBeTrue({obj: obj});
        this.assert(obj.a + obj.b == 3, "Solver failed")
    },

    testInequality: function() {
        var obj = {a: 8};
        (function () {
            return obj.a >= 100
        }).shouldBeTrue({obj: obj});
        this.assert(obj.a == 100);
        obj.a = 110;
        this.assert(obj.a == 110);
    },

    testSimplePath: function () {
        ClSimplexSolver.resetInstance();
        var pointA = pt(1,2),
            pointB = pt(2,3),
            o = {a: pointA, b: pointB};
        (function () {
            return o.a.x + 100 <= o.b.x;
        }).shouldBeTrue({o: o});
        this.assert(pointA.x + 100 <= pointB.x, "Solver failed")
    },
    testSimplePathInvalidation: function () {
        ClSimplexSolver.resetInstance();
        var pointA = pt(1,2),
            pointB = pt(2,3),
            o = {a: pointA, b: pointB};
        (function () {
            return o.a.x + 100 <= o.b.x;
        }).shouldBeTrue({o: o});
        this.assert(pointA.x + 100 <= pointB.x, "Solver failed");
        pointA = pt(12, 12);
        o.a = pointA;
        this.assert(pointA.x + 100 <= pointB.x, "Recalculating Path failed");
    },

    testTemperatureExample: function() {
        ClSimplexSolver.resetInstance();

        var obj = {fahrenheit: 212, centigrade: 100};

        (function () {
            return obj.fahrenheit - 32 == obj.centigrade * 1.8;
        }).shouldBeTrue({obj: obj});

        this.assert(CL.approx(obj.fahrenheit - 32, obj.centigrade * 1.8));
        obj.fahrenheit = 100;
        this.assert(CL.approx(obj.fahrenheit - 32, obj.centigrade * 1.8));
        obj.centigrade = 121;
        this.assert(CL.approx(obj.fahrenheit - 32, obj.centigrade * 1.8));
    },
    testUndefinedVariables: function() {
        var obj = {};
        bbb.always({
            allowTests: true,
            solver: ClSimplexSolver.getInstance(),
            ctx: {obj: obj}
        }, function () {
            return obj.a + obj.b == obj.c;
        })
    },

    testRecalculateForTextInput: function() {
        var obj = {
                txt: new lively.morphic.Text(),
                a: 10
            };
        obj.txt.setTextString("5");

        (function () {
            return obj.a == obj.txt.getTextString();
        }).shouldBeTrue({obj: obj});
        this.assert(obj.a == obj.txt.getTextString());
        
        obj.txt.setTextString("15");
        this.assert(obj.a == obj.txt.getTextString());
        this.assert(obj.a === 15)
    },

    testSimpleAssign: function () {
        ClSimplexSolver.resetInstance();
        var obj = {a: 2, b: 3};
        (function () {
            return obj.a + obj.b == 3;
        }).shouldBeTrue({obj: obj});
        this.assert(obj.a + obj.b == 3, "Solver failed");
        obj.a = -5;
        this.assert(obj.a + obj.b == 3, "Constraint violated after assignment");
    },

    testAssignStay: function() {
        var obj = {a: 2, b: 3};
        (function () {
            return obj.a + obj.b == 3;
        }).shouldBeTrue({obj: obj});
        this.assert(obj.a + obj.b == 3, "Solver failed");
        obj.a = -5;
        this.assert(obj.a + obj.b == 3, "Constraint violated after assignment");
        this.assert(obj.a == -5, "Assignment without effect");
    },
   testEqualityComplexObject: function() {
        var solver = new ClSimplexSolver(),
            assignmentFailed = false;
            point = pt();
        bbb.always({
            solver: solver,
            ctx: {
                solver: solver,
                point: point,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return point.equals(pt(10, 10).addPt(pt(11, 11)));;
        });
        
        this.assert(point.equals(pt(21, 21)), "changed invisible point!");
        try {
            point.x = 100;
        } catch(e) {
            assignmentFailed = true;
        }
        this.assert(point.equals(pt(21, 21)) && assignmentFailed, "changed x!");
        this.assert(point.equals(pt(21, 21)), "changed x!");
    },


    testPointEquals: function() {
        var pt1 = pt(10, 10),
            pt2 = pt(20, 20);
        (function () {
            return pt1.equals(pt2);
        }).shouldBeTrue({pt1: pt1, pt2: pt2});
        this.assert(pt1.equals(pt2));
    },

    testPointAddition: function() {
        var pt1 = pt(10, 10),
            pt2 = pt(20, 20),
            pt3 = pt(0, 0);
        (function () {
            return pt1.addPt(pt2).equals(pt3);
        }).shouldBeTrue({pt1: pt1, pt2: pt2, pt3: pt3});

        this.assert(pt1.addPt(pt2).equals(pt3));
    },

    testPointAssignment: function() {
        var obj = {p: pt(10, 10)};
        (function () {
            return obj.p.x >= 100 && obj.p.y >= 100;
        }).shouldBeTrue({obj: obj});

        this.assert(pt(100, 100).leqPt(obj.p));

        obj.p.x = 150;
        this.assert(pt(100, 100).leqPt(obj.p));
        this.assert(obj.p.x === 150);

        obj.p = pt(150, 100);
        this.assert(pt(100, 100).leqPt(obj.p));
        this.assert(obj.p.x === 150, "point assignment failed to keep the new point intact");
    },

    testPointAssignmentComplex: function() {
        var obj = {p: pt(10, 10), p2: pt(20, 20)};
        (function () {
            return (obj.p.equals(obj.p2) &&
                    obj.p.x >= 100 &&
                    obj.p.y >= 100);
        }).shouldBeTrue({obj: obj});

        this.assert(pt(100, 100).leqPt(obj.p));
        this.assert(obj.p.equals(obj.p2));

        obj.p.x = 150;
        this.assert(pt(100, 100).leqPt(obj.p));
        this.assert(obj.p.x === 150);
        this.assert(obj.p.equals(obj.p2));

        obj.p = pt(150, 100);
        this.assert(obj.p.equals(obj.p2));
        this.assert(obj.p.equals(pt(150, 100)), "point assignment failed to keep the new point intact");

        obj.p2 = pt(200, 200);
        this.assert(obj.p.equals(obj.p2), "Expected " + obj.p + " to equal " + obj.p2);
        this.assert(obj.p.equals(pt(200, 200)), "Expected " + obj.p + " to equal 200@200");
    },

    testPointAssignmentComplexScaled: function() {
        var obj = {p: pt(10, 10), p2: pt(20, 20)};
        (function () {
            return (obj.p.equals(obj.p2.scaleBy(2)) &&
                    obj.p.x >= 100 &&
                    obj.p.y >= 100);
        }).shouldBeTrue({obj: obj});

        this.assert(pt(100, 100).leqPt(obj.p));
        this.assert(obj.p.equals(obj.p2.scaleBy(2)));

        obj.p.x = 150;
        this.assert(pt(100, 100).leqPt(obj.p));
        this.assert(obj.p.x === 150);
        this.assert(obj.p.equals(obj.p2.scaleBy(2)));

        obj.p = pt(150, 100);
        this.assert(obj.p.equals(obj.p2.scaleBy(2)));
        this.assert(obj.p.equals(pt(150, 100)), "point assignment failed to keep the new point intact");

        obj.p2 = pt(200, 200);
        this.assert(obj.p.equals(obj.p2.scaleBy(2)),
                    "Expected " + obj.p + " to equal " + obj.p2 + " scaled by 2");
        this.assert(obj.p2.equals(pt(200, 200)),
                    "Expected " + obj.p2 + " to equal 200@200");

        obj.p2 = pt(15, 15);
        this.assert(obj.p.equals(obj.p2.scaleBy(2)));
        this.assert(obj.p2.equals(pt(50, 50)));
    },

    testSimpleReadonly: function() {
        var obj = {
            a: 10,
            b: 0
        };
        bbb.always({
            solver: ClSimplexSolver.getInstance(),
            ctx: {
                obj: obj,
                r: bbb.readonly
            }
        }, function() {
            return r(obj.a) == obj.b;
        });
        this.assert(obj.a == 10);
        this.assert(obj.b == 10);
        
        ClSimplexSolver.resetInstance();
        var obj2 = {
            a: 10,
            b: 0
        };
        bbb.always({
            solver: ClSimplexSolver.getInstance(),
            ctx: {
                obj2: obj2,
                r: bbb.readonly
            }
        }, function() {
            return obj2.a == r(obj2.b);
        });
        this.assert(obj2.a == 0);
        this.assert(obj2.b == 0);

        ClSimplexSolver.resetInstance();
        var obj3 = {
            a: 10,
            b: 0
        };
        try {
            bbb.always({
                solver: ClSimplexSolver.getInstance(),
                ctx: {
                        obj3: obj3,
                        r: bbb.readonly
                }
            }, function() {
                    return r(obj3.a) == r(obj3.b);
            });
            this.assert(false, "this constraint should throw an exception, because both variables are readonly");
        } catch(e) {}
    },

    testItemReadonly: function() {
        var i = {
                time: 1,
                value: 2,
                sum: 0
            },
            i2 = {
                time: 2,
                value: 3,
                sum: 0
            },
            solver = new ClSimplexSolver();
        solver.setAutosolve(false);
        bbb.always({solver: solver, ctx: {i: i, r: bbb.readonly}}, function () {
            return i.sum >= 0;
        });
        bbb.always({solver: solver, ctx: {i: i2, r: bbb.readonly}}, function () {
            return i.sum >= 0;
        });
        
        bbb.always({solver: solver, ctx: {i: i, r: bbb.readonly}}, function () {
            if (i.prev) {
                return i.sum == r(i.value) + i.prev.sum;
            } else {
                return i.sum == r(i.value);
            }
        });
        bbb.always({solver: solver, ctx: {i: i2, r: bbb.readonly}}, function () {
            if (i.prev) {
                return i.sum == r(i.value) + i.prev.sum;
            } else {
                return i.sum == r(i.value);
            }
        });
        this.assert(i.sum == 2, "expected sum to equal 2, got " + i.sum);
        this.assert(i2.sum == 3, "expected sum to equal 3, got " + i2.sum);
        i2.prev = i;
        this.assert(i.sum == 2, "expected sum to equal 2, got " + i.sum);
        this.assert(i2.sum == 5, "expected sum to equal 5, got " + i2.sum);
        i2.prev = {sum: 100}
        this.assert(i2.sum == 103, "expected sum to equal 103, got " + i2.sum);
    },
    testNoErrorWithStringConstraint: function() {
        var a = pt(0,0),
            b = "hello"
        bbb.always({
            solver: new ClSimplexSolver(),
            ctx: {
                ClSimplexSolver: ClSimplexSolver,
                a: a,
                ro: bbb.readonly,
                b: b,
                _$_self: this.doitContext || this
            }
        }, function() {
            return a.x == ro(b.length);;
        });
        this.assert(a.x == "hello".length)
    },
    test1LvlReadonly: function() {
        var solver = new ClSimplexSolver(),
            pt1 = lively.pt(0, 0),
            pt2 = lively.pt(10, 10);
        
        // always; { mrect.bottomRight().equals(ro(corner)) }
        bbb.always({
            solver: solver,
            ctx: {
                pt1: pt1,
                pt2: pt2,
                ro: bbb.readonly,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt1.equals(ro(pt2));
        });
        
        this.assert(pt1.equals(pt(10,10)))
        this.assert(pt2.equals(pt(10,10)))
        var failed = false;
        try { pt1.x = 5 } catch(e) { failed = true }
        this.assert(failed);
        this.assert(pt1.equals(pt(10,10)));
        this.assert(pt2.equals(pt(10,10)));
    },


    testConjunction: function() {
        var ctx = {a: 10, b: 100, c: 1000, d: 10000},
            constraint = (function () {
                return ctx.a == ctx.b && ctx.c == ctx.d
            }).shouldBeTrue({ctx: ctx});

        this.assert(ctx.a == ctx.b && ctx.c == ctx.d);
        // should have two primitive constraints
        this.assert(constraint.constraintobjects.length == 2);
    },

    setUp: function() {
        ClSimplexSolver.resetInstance();
    }
});


TestCase.subclass('users.timfelgentreff.babelsberg.tests.PropagationTest', {
    testSimplePropagation: function() {
        var o = {string: "0",
                 number: 0};

        (function () {
            return o.string == o.number + "";
        }).shouldBeSatisfiedWith(function () {
            o.string.formula([o.number], function (num) { return num + "" });
            o.number.formula([o.string], function (str) { return parseInt(str) });
        }, {o: o});

        this.assert(o.string === o.number + "");
        o.string = "1"
        this.assert(o.number === 1);
        o.number = 12
        this.assert(o.string === "12");
    },
    testJustEquality: function() {
        var db = new DBPlanner(),
            obj = {a: pt(0,0), b: pt(1,1)};
        bbb.always({
            solver: db,
            ctx: {
                db: db,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a == obj.b;
        });

        this.assert(obj.a.equals(obj.b));
        this.assert(obj.a !== obj.b);
    },
    testJustEquality2: function() {
        var db = new DBPlanner(),
            obj = {a: pt(0,0), b: pt(1,1)};
        bbb.always({
            solver: db,
            ctx: {
                db: db,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a.equals(obj.b);
        });

        this.assert(obj.a.equals(obj.b));
        this.assert(obj.a !== obj.b);
    },

    testAutomaticSetterInference: function() {
        var solver = new DBPlanner(),
            r1 = lively.morphic.Morph.makeRectangle(0,0,100,100),
            r2 = lively.morphic.Morph.makeRectangle(10,10,200,200),
            r1setPositionValue, r2setPositionValue;
        
        r1.setPosition = r1.setPosition.wrap(function (proceed, value) {
            r1setPositionValue = value;
            return proceed(value);
        })
        r2.setPosition = r2.setPosition.wrap(function (proceed, value) {
            r2setPositionValue = value;
            return proceed(value);
        })
        
        var c = bbb.always({
            solver: solver,
            ctx: {
                solver: solver,
                r1: r1,
                r2: r2,
                _$_self: this.doitContext || this
            }
        }, function() {
            return r1.getPosition().equals(r2.getPosition());;
        });
        this.assert(r1.getPosition().equals(r2.getPosition()));
        r2.setPosition(pt(5,5));
        this.assert(r1.getPosition().equals(r2.getPosition()));
        this.assert(r1.getPosition().equals(pt(5,5)));
        this.assert(r1setPositionValue.equals(pt(5,5)));
        r1.setPosition(pt(100,100));
        this.assert(r1.getPosition().equals(r2.getPosition()));
        this.assert(r2.getPosition().equals(pt(100,100)));
        this.assert(r2setPositionValue.equals(pt(100,100)));
    },
    testAutomaticSetterInferenceDeep: function() {
        var solver = new ClSimplexSolver(),
            r1 = lively.morphic.Morph.makeRectangle(0,0,100,100),
            r2 = lively.morphic.Morph.makeRectangle(10,10,200,200),
            r1setPositionValue, r2setPositionValue,
            r1setPositionCalls = 0, r2setPositionCalls = 0;
        
        r1.setPosition = r1.setPosition.wrap(function (proceed, value) {
            r1setPositionCalls++;
            r1setPositionValue = value;
            return proceed(value);
        })
        r2.setPosition = r2.setPosition.wrap(function (proceed, value) {
            r2setPositionCalls++;
            r2setPositionValue = value;
            return proceed(value);
        })
        
        var c = bbb.always({
            solver: solver,
            ctx: {
                solver: solver,
                r1: r1,
                r2: r2,
                _$_self: this.doitContext || this
            }
        }, function() {
            return r1.getPosition().equals(r2.getPosition());;
        });
        this.assert(r1.getPosition().equals(r2.getPosition()));
        r2.setPosition(pt(5,5));
        this.assert(r1.getPosition().equals(r2.getPosition()));
        this.assert(r1.getPosition().equals(pt(5,5)));
        
        this.assert(r2setPositionCalls === 1); // once above
        // XXX: Optimize this!
        this.assert(r1setPositionCalls === 1); // call each setter just once per satisfaction
        this.assert(r1setPositionValue.equals(pt(5,5)));
    },
    testIdentity: function() {
        var db = new DBPlanner(),
            obj = {a: pt(0,0), b: pt(1,1)};
        bbb.always({
            solver: db,
            ctx: {
                db: db,
                obj: obj,
                _$_self: this.doitContext || this
            }
        }, function() {
            return obj.a === obj.b;
        });
        
        this.assert(obj.a === obj.b, "");
        obj.a = pt(10,10);
        this.assert(obj.a === obj.b, "");
        obj.b = pt(10,10);
    },
    testIdentity2: function() {
        var db = new DBPlanner(),
            color = Color.rgb(200,0,0),
            color2 = Color.rgb(0,0,200);
        bbb.always({
            solver: db,
            ctx: {
                db: db,
                color: color,
                color2: color2,
                _$_self: this.doitContext || this
            }
        }, function() {
            return color.equals(color2);
        });
        this.assert(color.equals(color2));
        color.r = 0.1;
        color2.g = 0.7;
        this.assert(color.equals(color2));
        this.assert(color2.r === 0.1);
        this.assert(color.g === 0.7);
    },
    testBoolPropagation: function () {
        var o = {a: true,
                 b: 10};

        (function () {
            return o.a == (o.b > 15)
        }).shouldBeSatisfiedWith(function () {
            o.a.formula([o.b], function (b, a) { return b > 15 });
            o.b.formula([o.a], function (a, b) { return a ? 16 : 15 });
        }, {o: o});

        this.assert(!o.a, "deltablue changed a");
        o.b = 20;
        this.assert(o.a, "deltablue changed a");
        o.a = false;
        this.assert(o.b === 15, "deltablue changed b");
        o.b = 20;
        this.assert(o.a, "deltablue changed a");
        o.a = true;
        this.assert(o.b === 20, "deltablue didn't change b, because the predicate was satisfied");
    },

    testArithmetic: function() {
        var o = {x: 0, y: 0, z: 0};

        (function () {
            return o.x + o.y == o.z;
        }).shouldBeSatisfiedWith(function () {
            o.x.formula([o.y, o.z], function (y, z) { debugger; return z - y });
            o.y.formula([o.x, o.z], function (x, z) { debugger; return z - x });
            o.z.formula([o.x, o.y], function (x, y) { debugger; return x + y });
        }, {o: o});

        this.assert(o.x + o.y == o.z);
        o.x = 10;
        this.assert(o.x == 10);
        this.assert(o.x + o.y == o.z);
        o.y = 15;
        this.assert(o.y == 15);
        this.assert(o.x + o.y == o.z);
        o.z = 100;
        this.assert(o.z == 100);
        this.assert(o.x + o.y == o.z);
    },

    testDeltaBlueUserFunction: function() {
        var planner = new DBPlanner(),
            string = new DBVariable("string", "0", planner),
            number = new DBVariable("number", 0, planner);

        var constraint = new UserDBConstraint(function (c) {
            c.formula(string, [number], function (num) { return num + ""; });
            c.formula(number, [string], function (str) { return parseInt(str); });
        }, planner);
        constraint.addDBConstraint();

        number.assignValue(10);
        this.assert(number.value === 10, "new value should stick");
        this.assert(string.value === "10", "new value should propagate");

        string.assignValue("12");
        this.assert(number.value === 12, "new value should propagate");
        this.assert(string.value === "12", "new value should stick");
    },
    setUp: function() {
        DBPlanner.resetInstance()
    },
    testNoPredicate: function () {
        var db = new DBPlanner(),
            element = {color: "red", celsius: 50};
            
        bbb.always({solver: db, ctx: {e: element}}, function() {
            e.color.formula([e.celsius],
                function(c) {
                    return c > 50 ? "red" : "blue";
                });
            }
        );
        
        this.assert(element.color === "blue", "should have changed to blue");
        this.assert(element.celsius === 50);
        
        element.celsius = 70
        this.assert(element.color === "red", "should have changed to red");
        this.assert(element.celsius === 70);
        
        element.celsius = 30
        this.assert(element.color === "blue", "should have changed to blue");
        this.assert(element.celsius === 30);
    }
});
TestCase.subclass('users.timfelgentreff.babelsberg.tests.InteractionTest', {
    testInteractionAssignment: function () {
        var o = {a: true,
                 b: 10};

        (function () { return o.b >= 11 }).shouldBeTrue({o: o});
        this.assert(o.a, "a unchanged");
        this.assert(o.b === 11, "b fixed");

        (function () {
            return o.a == (o.b > 15)
        }).shouldBeSatisfiedWith(function () {
            o.a.formula([o.b], function (b, a) { return b > 15 });
            o.b.formula([o.a], function (a, b) { return a ? 16 : 15 });
        }, {o: o});
        this.assert(!o.a, "deltablue is downstream from cassowary and has to change a");
        this.assert(o.b === 11, "deltablue is downstream from cassowary and has to change a");

        o.b = 20;
        this.assert(o.a, "deltablue changed a");
        this.assert(o.b === 20, "cassowary updated this");
    },
    testDynamicRegions2: function () {
        var f = new lively.morphic.Slider(rect(0,0,100,20)),
            c = new lively.morphic.Slider(rect(0,0,100,20)),
            ft = new lively.morphic.Text(rect(0,0,50,50), ""),
            ct = new lively.morphic.Text(rect(0,0,50,50), ""),
            cassowary = new ClSimplexSolver(),
            deltablue = new DBPlanner(),
            db2 = new DBPlanner();

        bbb.always({
            solver: cassowary,
            ctx: {
                cassowary: cassowary,
                f: f,
                c: c,
                _$_self: this.doitContext || this
            }
        }, function() {
            return f.getValue() * 100 - 32 == c.getValue() * 100 * 1.8 &&
                    f.getValue() >= 0 && c.getValue() >= 0 &&
                    f.getValue() <= 1 && c.getValue() <= 1;
        });
    
        bbb.always({
            solver: deltablue,
            ctx: {
                deltablue: deltablue,
                ft: ft,
                f: f,
                Math: Math,
                parseFloat: parseFloat,
                _$_self: this.doitContext || this
            }
        }, function() {
            ft.getTextString().formula([ f.getValue() ], function(v) {
                return Math.round(v * 100) + "";
            });
            return f.getValue().formula([ ft.getTextString() ], function(v) {
                return parseFloat(v) / 100;
            });;
        });

        bbb.always({
            solver: db2,
            ctx: {
                db2: db2,
                ct: ct,
                c: c,
                Math: Math,
                parseFloat: parseFloat,
                _$_self: this.doitContext || this
            }
        }, function() {
            ct.getTextString().formula([ c.getValue() ], function(v) {
                return Math.round(v * 100) + "";
            });
            return c.getValue().formula([ ct.getTextString() ], function(v) {
                return parseFloat(v) / 100;
            });;
        });

        f.setValue(0.5);
        this.assert(c.getValue() == 0.1, "1 Cassowary");
        this.assert(ct.getTextString() == "10", "1 DeltaBlue");
        this.assert(ft.getTextString() == "50", "1 DeltaBlue2");
        
        c.setValue(0);
        this.assert(f.getValue() == 0.32, "2 Cassowary");
        this.assert(ct.getTextString() == "0", "2 DeltaBlue");
        this.assert(ft.getTextString() == "32", "2 DeltaBlue2");
        
        ft.setTextString("50");
        this.assert(approxEq(f.getValue(), 0.5), "3 DeltaBlue");
        this.assert(approxEq(c.getValue(), 0.1), "3 Cassowary");
        this.assert(ct.getTextString() == "10", "3 DeltaBlue2");
        
        ct.setTextString("0");
        this.assert(approxEq(c.getValue(), 0), "4 DeltaBlue");
        this.assert(approxEq(f.getValue(), 0.32), "4 Cassowary");
        this.assert(ft.getTextString() == "32", "4 DeltaBlue2");
        
        f.setValue(0.5);
        this.assert(approxEq(c.getValue(), 0.1), "5 Cassowary");
        this.assert(ct.getTextString() == "10", "5 DeltaBlue");
        this.assert(ft.getTextString() == "50", "5 DeltaBlue2");
        
        c.setValue(0);
        this.assert(approxEq(f.getValue(), 0.32), "6 Cassowary");
        this.assert(ct.getTextString() == "0", "6 DeltaBlue");
        this.assert(ft.getTextString() == "32", "6 DeltaBlue2");
        
        function approxEq(v1, v2) {
            return v1.toFixed(1) === v2.toFixed(1);
        }
    },
    testDynamicRegions: function () {
        var a = pt(0,0),
            b = {str: ""},
            c = new ClSimplexSolver(),
            d = new DBPlanner();

        bbb.always({
            solver: c,
            ctx: { c: c, a: a}
        }, function() {
            return a.x == a.y;;
        });
                
        bbb.always({
            solver: d,
            ctx: { d: d, a: a, b: b, parseFloat: parseFloat }
        }, function() {
            a.x.formula([ b.str ], function(v) {
                return parseFloat(v);
            });
            return b.str.formula([ a.x ], function(v) {
                var fullStr = v + "";
                if (fullStr.indexOf(".") === -1) {
                    return v.toFixed(1);
                } else {
                    return fullStr;
                }
            });;
        });
        
        a.x = 10;
        this.assert(a.y === 10, "1) Cassowary did not kick in");
        this.assert(b.str === "10.0", "1) DeltaBlue did not kick in");
        
        a.y = 5;
        this.assert(a.x === 5, "2) Cassowary did not kick in");
        this.assert(b.str === "5.0", "2) DeltaBlue did not kick in");
        
        b.str = "7.5";
        this.assert(a.x == 7.5, "3a) Cassowary did not kick in");
        this.assert(a.y == 7.5, "3b) Cassowary did not kick in");
        this.assert(b.str == "7.5", "3) DeltaBlue did not kick in");
    },
    testInteractionAssignmentIndirect: function () {
        var o = {a: true,
                 b: 10,
                 c: 5};

        (function () { return o.b + o.c >= 20 }).shouldBeTrue({o: o});
        this.assert(o.a, "a unchanged");
        this.assert(o.b === 15, "b fixed " + o.b);

        (function () {
            return o.a == (o.b > 15)
        }).shouldBeSatisfiedWith(function () {
            o.a.formula([o.b], function (b, a) { return b > 15 });
            o.b.formula([o.a], function (a, b) { return a ? 16 : 15 });
        }, {o: o});
        this.assert(!o.a, "deltablue is downstream from cassowary and has to change a to " + o.a);
        this.assert(o.b === 15, "deltablue is downstream from cassowary and has to change a");

        o.c = 1;
        this.assert(o.a, "deltablue changed a");
        this.assert(o.b === 19, "cassowary updated this");
    },
    xxxTestEdit: function() {
        var obj = {a: 0, b: 1, c: "2"},
            cassowary = new ClSimplexSolver(),
            deltablue = new DBPlanner();
        cassowary.setAutosolve(false);

        bbb.always({solver: cassowary, ctx: {obj: obj}}, function () {
            return obj.a == obj.b;
        });
        bbb.always({solver: deltablue, ctx: {obj: obj}, methods: function () {
            obj.b.formula([obj.c], function (c) { return parseInt(c); });
            obj.c.formula([obj.b], function (b) { return b + ""; })
        }}, function () {
            return obj.b == obj.c;
        });
        
        this.assert(obj.a === obj.b);
        this.assert(obj.c == obj.b);
        this.assert(obj.c !== obj.b);
        
        obj.a = 10;
        this.assert(obj.a === 10);
        this.assert(obj.a === obj.b);
        this.assert(obj.c == obj.b);
        this.assert(obj.c !== obj.b);
        
        var cb = bbb.edit(obj, ["b"]);
        cb([5]);
        this.assert(obj.b === 5);
        this.assert(obj.a === obj.b);
        this.assert(obj.c == obj.b);
        this.assert(obj.c !== obj.b);
        cb([11])
        this.assert(obj.b === 11);
        this.assert(obj.a === obj.b);
        this.assert(obj.c == obj.b);
        this.assert(obj.c !== obj.b);
    }

});

TestCase.subclass('users.timfelgentreff.babelsberg.tests.CSPTest', {
    testBacktalkPaperExample: function () {
	    var solver = bbb.defaultSolver = new csp.Solver();
    	var man = {
			shoes: "foo",
			shirt: "foo",
			pants: "foo",
			hat: "foo"
		};
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes.is in ["brown", "black"];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shirt.is in ["brown", "blue", "white"];;
        });
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.pants.is in ["brown", "blue", "black", "white"];;
        });
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.hat.is in ["brown"];;
        });
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes === man.hat;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes !== man.pants;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shoes !== man.shirt;;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                man: man,
                _$_self: this.doitContext || this
            }
        }, function() {
            return man.shirt !== man.pants;;
        });

        this.assert(man.hat === "brown", "hat's domain is restricted to 'brown' only");
        this.assert(man.shoes === "brown", "shoes have to be 'brown'");
        this.assert(man.shirt === "blue" || man.shirt === "white", "shirt has to be 'blue' or 'white'");
        this.assert(man.shirt !== man.pants, "shirt and pants must not have the same color");
        this.assert(man.pants === "black" || man.pants === "blue" || man.pants === "white", "pants should be 'black', 'blue' or 'white'");
    },
    testForceToDomain: function () {
	    var solver = bbb.defaultSolver = new csp.Solver();
	    var pt = {x: 5, y: 2};
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });

	    this.assert([1, 2, 3].indexOf(pt.x) > -1, "x is not in its domain [1, 2, 3], but " + pt.x);
    },
    testRemainIfInDomain: function () {
	    var solver = bbb.defaultSolver = new csp.Solver();
	    var pt = {x: 5, y: 2};
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [4, 5, 6];;
        });

	    this.assert(pt.x === 5, "x does not stay at 5, but probably raims in its domain [4, 5, 6]; x: " + pt.x);
    },
    testErrorOnEmptyDomain: function () {
	    var solver = bbb.defaultSolver = new csp.Solver(),
	    	pt = {x: 5, y: 2},
	    	errorThrown = false;
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [];;
        });
        try {
		    solver.newVariable(pt, "x", []);
	    } catch (e) {
	    	errorThrown = true;
	    }

	    this.assert(errorThrown, "no error was thrown on empty domain");
    },
    testAssignment: function () {
	    var solver = bbb.defaultSolver = new csp.Solver(),
	    	pt = {x: 2, y: 6},
	    	errorThrown = false;
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3, 4, 5, 6, 7, 8, 9];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.y.is in [4, 5, 6, 7, 8, 9, 10, 11, 12];;
        });
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x + 4 === pt.y;;
        });
	
        pt.x = 8;
        this.assert(pt.x === 8, "assignment 'x = 8' was not successful; x: " + pt.x);
	    this.assert(pt.y === 12, "constraint 'x + 4 == y' not satisfied; y: " + pt.y);
	    
	    pt.y = 7;
	    this.assert(pt.y === 7, "assignment 'y = 7' was not successful; y: " + pt.y);
	    this.assert(pt.x === 3, "constraint 'x + 4 == y' not satisfied; x: " + pt.x);
    },
    testAssignment2: function () {
	    var solver = bbb.defaultSolver = new csp.Solver(),
	    	pt = {x: 2, y: 8},
	    	errorThrown = false;
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3, 4, 5, 6, 7, 8, 9];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.y.is in [4, 5, 6, 7, 8, 9, 10, 11, 12];;
        });

        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x + pt.y >= 10;;
        });
	
        this.assert(pt.x + pt.y >= 10, "constraint 'pt.x + pt.y >= 10' does not hold for x: "+ pt.x+", y: " + pt.y);

	    pt.y = 4;
        this.assert(pt.y === 4, "assignment 'y = 4' was not successful; y: " + pt.y);
        this.assert(pt.x + pt.y >= 10, "constraint 'pt.x + pt.y >= 10' does not hold for x: "+ pt.x+", y: " + pt.y);
    },
    testFailingAssignmentOnDomain: function () {
	    var solver = bbb.defaultSolver = new csp.Solver(),
	    	pt = {x: 5, y: 2},
	    	errorThrown = false;
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });
	    
	    try {
	        pt.x = 0;
	    } catch (e) {
	    	errorThrown = true;
	    }
	
	    this.assert(errorThrown, "no error was thrown on new value x = 0 with domain [1, 2, 3]; x: " + pt.x);
    },
    testFailingAssignment: function () {
    	// try x = 0 with constraint x > 4
	    var solver = bbb.defaultSolver = new csp.Solver(),
	    	pt = {x: 2, y: 8},
	    	errorThrown = false;
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3, 4, 5, 6, 7, 8, 9];;
        });
        
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.y.is in [1, 2, 3, 4, 5, 6, 7, 8, 9];;
        });
	    
	    bbb.always({
	        ctx: {
	            bbb: bbb,
	            csp: csp,
	            solver: solver,
	            pt: pt,
	            _$_self: this.doitContext || this
	        }
	    }, function() {
	        return pt.x > 4;;
	    });
	
	    bbb.always({
	        ctx: {
	            bbb: bbb,
	            csp: csp,
	            solver: solver,
	            pt: pt,
	            _$_self: this.doitContext || this
	        }
	    }, function() {
	        return pt.x + pt.y === 10;;
	    });

	    this.assert(pt.x > 4, "constraint 'pt.x  > 4' does not hold for x: "+ pt.x);
	    this.assert(pt.x + pt.y === 10, "constraint 'pt.x + pt.y === 10' does not hold for x: "+ pt.x + ", y: " + pt.y);
	
	    var oldValueX = pt.x;
	    var oldValueY = pt.y;
	    
	    try {
	        pt.y = 7;
	    } catch (e) {
	    	errorThrown = true;
	    }
        this.assert(errorThrown, "no error was thrown on new value y = 7 with constraints 'pt.x + pt.y === 10' and 'pt.x  > 4'; x: " + pt.x + ", y: " + pt.y);
	    this.assert(pt.y === oldValueY, "old value of y not restored after failed assignment; currentY: " + pt.y + ", oldY: " + oldValueY);
	    this.assert(pt.x === oldValueX, "old value of x not restored after failed assignment; currentX: " + pt.x + ", oldX: " + oldValueX);
    },
    testUnsatisfiableConstraint: function () {
	    var solver = bbb.defaultSolver = new csp.Solver(),
	    	pt = {x: 5, y: 2},
	    	errorThrown = false;
	    
        bbb.always({
            ctx: {
                bbb: bbb,
                csp: csp,
                solver: solver,
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });
	    
	    try {
	        bbb.always({
	            ctx: {
	                bbb: bbb,
	                csp: csp,
	                solver: solver,
	                pt: pt,
	                _$_self: this.doitContext || this
	            }
	        }, function() {
	            return pt.x >= 5;;
	        });
	    } catch (e) {
	    	errorThrown = true;
	    }
	
	    this.assert(errorThrown, "no error was thrown on unsatisfiable constraint");
    }
});

TestCase.subclass('users.timfelgentreff.babelsberg.tests.OnErrorTest', {
    testCassowaryThrowsACouldNotSatisfyError: function () {
        var obj = {a:0, b:10},
			s = new ClSimplexSolver(),
			couldNotSatisfyErrorThrown = false;

		bbb.always({
			solver: s,
			ctx: {
				bbb: bbb,
				obj: obj,
				_$_self: this.doitContext || this
			}
		}, function() {
			return obj.a == 0;;
		});
		
		// not satisfiable assignment
		try {
			obj.a = 10;
		} catch(e) {
			if(e instanceof CouldNotSatisfyError) {
				couldNotSatisfyErrorThrown = true;
			}
		}
		
		this.assert(couldNotSatisfyErrorThrown, "no CouldNotSatisfyError was thrown, when expected; obj.a: " + obj.a);
    },
    testCallOnError: function () {
        var obj = {a: 0},
			onErrorCalled = false;

		bbb.defaultSolver = new ClSimplexSolver();
		
		bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
			ctx: {
				bbb: bbb,
				obj: obj,
				_$_self: this.doitContext || this
			}
		}, function() {
			return obj.a == 0;;
		});

		bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
			ctx: {
				bbb: bbb,
				obj: obj,
				_$_self: this.doitContext || this
			}
		}, function() {
			return obj.a == 10;;
		});
	
		this.assert(onErrorCalled, "onError was not called; obj.a: " + obj.a);
    },
    testCallOnErrorAssignment: function () {
        var obj = {a: 0},
			onErrorCalled = false;

		bbb.defaultSolver = new ClSimplexSolver();
		
		bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
			ctx: {
				bbb: bbb,
				obj: obj,
				_$_self: this.doitContext || this
			}
		}, function() {
			return obj.a == 0;;
		});

		obj.a = 10;
		
		this.assert(onErrorCalled, "onError was not called; obj.a: " + obj.a);
    },
    _testDeltaBlueConstraintConstruction: function () {
        var obj = {int: 17, str: "17"},
			onErrorCalled = false;

		bbb.defaultSolver = new DBPlanner();
		
		bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
			ctx: {
				obj: obj
			}, methods: function() {
				obj.int.formula([obj.str], function (str) { return parseInt(str); });
				obj.str.formula([obj.int], function (int) { return int + ""; })
			}
		}, function () {
			return obj.int + "" === obj.str;
		});
		bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
			ctx: {
				obj: obj
			}, methods: function() {
				obj.int.formula([obj.str], function (str) { return parseInt(str)-1; });
				obj.str.formula([obj.int], function (int) { return (int+1) + ""; })
			}
		}, function () {
			return (obj.int+1) + "" === obj.str;
		});

		obj.str = "10";
		
		this.assert(onErrorCalled, "onError was not called; obj.a: " + obj.a);
    },
    testCSPConstraintConstruction: function () {
        var pt = {x: 5, y: 2},
			onErrorCalled = false;

		bbb.defaultSolver = new csp.Solver();
	    
        bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
            ctx: {
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });
	    
		bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
			ctx: {
				pt: pt,
				_$_self: this.doitContext || this
			}
		}, function() {
			return pt.x >= 5;;
		});
	
	    this.assert(onErrorCalled, "onError was not called");
    },
    testCSPAssignment: function () {
        var pt = {x: 1, y: 2},
			onErrorCalled = false;

		bbb.defaultSolver = new csp.Solver();
	    
        bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
            ctx: {
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x.is in [1, 2, 3];;
        });

	    this.assert(!onErrorCalled, "onError called unexpectedly");

		pt.x = 5;
	
	    this.assert(onErrorCalled, "onError was not called");
    },
    testRelaxConstraintConstruction: function () {
        var pt = {x: 5},
			onErrorCalled = false;

		bbb.defaultSolver = new Relax();
	    
        bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
            ctx: {
                pt: pt,
                _$_self: this.doitContext || this
            }
        }, function() {
            return pt.x == 5;;
        });
	    
		bbb.always({
			onError: function() {
				onErrorCalled = true;
			},
			ctx: {
				pt: pt,
				_$_self: this.doitContext || this
			}
		}, function() {
			return pt.x >= 20;;
		});
	
	    this.assert(onErrorCalled, "onError was not called");
    }
});

}) // end of module

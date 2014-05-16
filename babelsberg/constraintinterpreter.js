module('users.timfelgentreff.babelsberg.constraintinterpreter').requires('users.timfelgentreff.jsinterpreter.Interpreter', 'cop.Layers', 'users.timfelgentreff.babelsberg.cassowary_ext', 'users.timfelgentreff.babelsberg.deltablue_ext', 'users.timfelgentreff.babelsberg.core_ext', 'users.timfelgentreff.babelsberg.src_transform').toRun(function() {



// branched from 198617



Object.subclass("Babelsberg", {

    isConstraintObject: function () {

        return true;

    },

    

    unconstrain: function (obj, accessor) {

        if (!obj) return;

        var cvar = ConstrainedVariable.findConstraintVariableFor(obj, accessor);

        if (!cvar) return;

        var cGetter = obj.__lookupGetter__(accessor),

            cSetter = obj.__lookupSetter__(accessor);

        if (!cGetter && !cSetter) {

            return;

        }

        if (!cGetter.isConstraintAccessor || !cSetter.isConstraintAccessor) {

            throw "too many accessors - unconstrain only works for the very simple case now"

        }

        ConstrainedVariable.deleteConstraintVariableFor(obj, accessor);

        var newName = cvar.newIvarname;

        var existingSetter = obj.__lookupSetter__(newName),

            existingGetter = obj.__lookupGetter__(newName);

        if (existingGetter) {

            obj.__defineGetter__(this.accessor, existingGetter);

        }

        if (existingSetter) {

            obj.__defineSetter__(this.accessor, existingSetter);

        }

        if (!existingSetter || !existingGetter) {

            delete obj[accessor];

        }

        obj[accessor] = obj[newName];

        delete obj[newName]

        

        // recursive unconstraint

        var child = obj[accessor];

        if(child && child instanceof Object) {

            Object.keys(child).each(function(property, index) {

                var cvar = ConstrainedVariable.findConstraintVariableFor(child, property);

                if (!cvar) return;

                var cGetter = child.__lookupGetter__(property),

                    cSetter = child.__lookupSetter__(property);

                if (!cGetter && !cSetter) return;

                if (!cGetter.isConstraintAccessor || !cSetter.isConstraintAccessor) return;

                

                bbb.unconstrain(child, property);

            });

        }

    },

    

    edit: function (obj, accessors) {

        var extVars = {},

            cVars = {},

            extConstraints = [],

            solvers = [],

            callback = function (newObj) {

                if (!newObj) { // end-of-edit

                    for (var prop in extVars) {

                        extVars[prop].each(function (evar) {

                            evar.finishEdit();

                        });

                    }

                    solvers.invoke("endEdit");

                } else {

                    var newEditConstants = newObj;

                    if (!Object.isArray(newObj)) {

                        newEditConstants = accessors.map(function (accessor) {

                            return newObj[accessor];

                        });

                    }

                    solvers.invoke("resolveArray", newEditConstants);

                    accessors.each(function (a) {

                        cVars[a].suggestValue(cVars[a].externalValue);

                        // extVars[a] = extVars[a]; // set the value,

                                                 // propagates change to other property accessors

                                                 // calls the setters

                                                 // does not recurse into solvers, because they have already

                                                 // adopted the correct value

                    })

                }

            };



        accessors.each(function (accessor) {

            var cvar = ConstrainedVariable.findConstraintVariableFor(obj, accessor);

            if (!cvar) {

                throw "Cannot edit " + obj + '["' + accessor + '"], because it isn\'t constrained'

            }

            var evars = Properties.values(cvar._externalVariables);

            if (evars.compact().length < evars.length) {

                throw "Cannot edit " + obj + '["' + accessor + '"], because it is in a recalculate relation'

            }

            if (cvar.solvers.any(function (s) { return !Object.isFunction(s.beginEdit) })) {

                throw "Cannot edit " + obj + '["' + accessor + '"], because it is in a no-edit solver'

            }

            cVars[accessor] = cvar;

            extVars[accessor] = evars;

            solvers = solvers.concat(cvar.solvers).uniq();

            evars.each(function (evar) {

                evar.prepareEdit();

            });

        });



        solvers.invoke("beginEdit");

        return callback;

    },

    readonly: function(obj) {

        if (obj.isConstraintObject) {

            obj.setReadonly(true);

        } else {

            if (Constraint.current && Constraint.current.solver) {

                Properties.own(obj).each(function (ea) {

                    var cvar = ConstrainedVariable.newConstraintVariableFor(obj, ea);

                    cvar.addToConstraint(Constraint.current);

                    cvar.ensureExternalVariableFor(Constraint.current.solver);

                    if (cvar.isSolveable()) {

                        bbb.readonly(cvar.externalVariables(Constraint.current.solver))

                    }

                });

            }

        }

        return obj;

    },



    always: function(opts, func) {

        var solver = opts.solver || this.defaultSolver;

        if (!solver) throw "Must explicitely pass a solver for now";

        func.allowTests = (opts.allowTests === true);

        func.allowUnsolvableOperations = (opts.allowUnsolvableOperations === true);

        func.debugging = opts.debugging;

        return solver.always(opts, func);

    }



});

Object.extend(Global, {

    bbb: new Babelsberg()

});



users.timfelgentreff.jsinterpreter.Send.addMethods({

    get args() {

        return this._$args || []

    },

    

    set args(value) {

        this._$args = value

    }

});

cop.create('MorphSetConstrainedPositionLayer').refineClass(lively.morphic.Morph, {

    setPosition: function(newPos) {

        if (this.editCb) {

            this.editCb(newPos);

            return this.renderContextDispatch('setPosition', newPos);

        } else {

            return cop.proceed(newPos);

        }

    },

}).refineClass(lively.morphic.DragHalo, {

    dragStartAction: function() {

        this.targetMorph.editCb = bbb.edit(this.targetMorph.getPosition(), ["x", "y"]);

        return cop.proceed.apply(this, arguments);

    },

    dragEndAction: function() {

        this.targetMorph.editCb();

        return cop.proceed.apply(this, arguments);

    }

});



cop.create("ConstraintConstructionLayer").refineObject(users.timfelgentreff.jsinterpreter, {

    get InterpreterVisitor() {

        return ConstraintInterpreterVisitor;

    }

}).refineClass(users.timfelgentreff.jsinterpreter.Send, {

    asFunction: function(optFunc) {

        var initializer = optFunc.prototype.initialize.ast().asFunction();

        initializer.original = optFunc;

        return initializer;

    }

}).refineClass(users.timfelgentreff.jsinterpreter.GetSlot, {

    set: function(value, frame, interpreter) {

        var obj = interpreter.visit(this.obj),

            name = interpreter.visit(this.slotName);

        if (obj === Global || (obj instanceof lively.Module)) {

            return obj[name] = value;

        }

        if (obj && obj.isConstraintObject) {

            obj = this.getConstraintObjectValue(obj);

        }

        

        obj[name] = value;

        cvar = ConstrainedVariable.newConstraintVariableFor(obj, name);

        if (Constraint.current) {

            cvar.ensureExternalVariableFor(Constraint.current.solver);

            cvar.addToConstraint(Constraint.current);

            if (cvar.isSolveable()) {

                Constraint.current.addPrimitiveConstraint(cvar.externalVariable.cnEquals(value));

            }

        }

    },

});



Object.subclass('Constraint', {

    initialize: function(predicate, solver) {

        this._enabled = false;

        this._predicate = predicate;

        this.constraintobjects = [];

        this.constraintvariables = [];

        this.solver = solver;



        // FIXME: this global state is ugly

        try {

            Constraint.current = this;

            var constraintObject = cop.withLayers([ConstraintConstructionLayer], function () {

                return predicate.forInterpretation().apply(undefined, []);

            });

        } finally {

            Constraint.current = null;

        }

        this.addPrimitiveConstraint(constraintObject); //// isn't constraintObject always undefined in this scope?

    },

    addPrimitiveConstraint: function(obj) {

        if (typeof(obj) != "undefined" && !this.constraintobjects.include(obj)) {

            this.constraintobjects.push(obj);

        }

    },

    addConstraintVariable: function(v) {

        if (v && !this.constraintvariables.include(v)) {

            this.constraintvariables.push(v);

        }

    },







    get predicate() {

        return this._predicate;

    },

    get allowUnsolvableOperations() {

        dbgOn(this.predicate.debugging);

        return !!this.predicate.allowUnsolvableOperations;

    },

    get allowTests() {

        dbgOn(this.predicate.debugging);

        return !!this.predicate.allowTests;

    },



    get priority() {

        return this._priority;

    },



    set priority(value) {

        var enabled = this._enabled;

        if (enabled) {

            this.disable();

        }

        this._priority = value;

        if (enabled) {

            this.enable();

        }

    },



    get value() {

        return this.constraintobjects.last();

    },



    enable: function() {

        if (!this._enabled) {

            this.constraintobjects.each(function (ea) {

                this.enableConstraintObject(ea);

            }.bind(this));

            if (this.constraintobjects.length === 0) {

                throw new Error("BUG: No constraintobjects were created.");

            }

            this._enabled = true;

            this.solver.solve();

        }

    },



    enableConstraintObject: function(obj, optPriority) {

        if (obj === true) {

            if (this.allowTests) {

                alertOK("Warning: Constraint expression returned true. Re-running whenever the value changes");

            } else {

                throw new Error("Constraint expression returned true, but was not marked as test. If you expected this to be solveable, check that there are no operations in this that cannot be solved by the selected solver (e.g. Cassowary does not support `<', only `<='). Otherwise, if you think this is ok, you must pass `allowTests: true' as option to the constraint.");

            }

        } else if (obj === false) {

            throw new Error("Constraint expression returned false, no solver available to fix it");

        } else if (!obj.enable) {

            throw new Error("Constraint expression returned an object that does not respond to #enable");

        } else {

            obj.solver = this.solver; // XXX: Bit of a hack, should really write it so

                                      // this gets passed through from the variables

            obj.enable(optPriority || this._priority);

        }

    },



    disable: function() {

        if (this._enabled) {

            this.constraintobjects.each(function (ea) {

                try {ea.disable()} catch(e) {}

            });

            this._enabled = false;

        }

    },



    recalculate: function() {

        // TODO: Fix this so it uses the split-stay result, i.e. just increase the stay for the newly assigned value

        var enabled = this._enabled,

            cvars = this.constraintvariables,

            self = this,

            assignments;

        if (enabled) {

            this.disable();

        }

        this.initialize(this.predicate, this.solver);



        cvars.select(function (ea) {

            // all the cvars that are not in this constraint anymore

            return !this.constraintvariables.include(ea) && ea.isSolveable();

        }.bind(this)).each(function (ea) {

            return ea.externalVariable.removeStay();

        });



        if (enabled) {

            assignments = this.constraintvariables.select(function (ea) {

                // all the cvars that are new after this recalculation

                return !cvars.include(ea) && ea.isSolveable();

            }).collect(function (ea) {

                // add a required constraint for the new variable

                // to keep its new value, to have the same semantics

                // as for direct assignment

                return ea.externalVariable.cnIdentical(ea.getValue());

            });



            assignments.each(function (ea) {

                try {

                    self.enableConstraintObject(ea);

                } catch(_) { // if the assignment cannot be completely satisfied, make it strong

                    self.enableConstraintObject(ea, self.solver.strength.strong);

                }

            });



            try {

                // try to enable this constraints with (some) required assignments

                this.enable();

            } catch(_) {

                // if it fails, disable, make all the assignments only strong, re-enable

                this._enabled = true; // force disable to run

                this.disable();

                assignments.invoke("disable");

                assignments.invoke("enable", this.solver.strength.strong);

                this.enable();

            } finally {

                assignments.invoke("disable");

            }

        }

    },

});

Object.extend(Constraint, {

    set current(p) {

        if (!this._previous) {

            this._previous = []

        }

        if (p === null) {

            if (this._previous.length > 0) {

                this._current = this._previous.pop();

            } else {

                this._current = null;

            }

            return;

        }

        if (this._current) {

            this._previous.push(this._current);

        }

        this._current = p;

    },



    get current() {

        return this._current;

    },



});

Object.subclass('ConstrainedVariable', {

    initialize: function(obj, ivarname, optParentCVar) {

        this.obj = obj;

        this.ivarname = ivarname;

        this.newIvarname = "$1$1" + ivarname;

        this.parentConstrainedVariable = optParentCVar;

        this._constraints = [];

        this._externalVariables = {};



        var value = obj[ivarname],

            solver = this.currentSolver;



        dbgOn(!solver)

        this.ensureExternalVariableFor(solver);



        var existingSetter = obj.__lookupSetter__(this.ivarname),

            existingGetter = obj.__lookupGetter__(this.ivarname);



        if (existingGetter && !existingGetter.isConstraintAccessor) {

            obj.__defineGetter__(this.newIvarname, existingGetter);

        }

        if (existingSetter && !existingSetter.isConstraintAccessor) {

            obj.__defineSetter__(this.newIvarname, existingSetter);

        }

        // assign old value to new slot

        if (!existingGetter && !existingSetter && this.obj.hasOwnProperty(this.ivarname)) {

            this.setValue(obj[ivarname]);

        }



        try {

            obj.__defineGetter__(ivarname, function() {

                return this.getValue();

            }.bind(this));

        } catch (e) { /* Firefox raises for Array.length */ }

        var newGetter = obj.__lookupGetter__(this.ivarname);

        if (!newGetter) {

            // Chrome silently ignores __defineGetter__ for Array.length

            this.externalVariables(solver, null);

            return;

        }



        obj.__defineSetter__(ivarname, function(newValue) {

            return this.suggestValue(newValue);

        }.bind(this));

        var newSetter = obj.__lookupSetter__(this.ivarname);



        newSetter.isConstraintAccessor = true;

        newGetter.isConstraintAccessor = true;

    },

    ensureExternalVariableFor: function(solver) {

        var eVar = this.externalVariables(solver),

            value = this.obj[this.ivarname];



        this.cachedDefiningSolver = null;

        this.cachedDefiningVar = null;

        if (!eVar && eVar !== null) { // don't try to create an external variable twice

            this.externalVariables(solver, solver.constraintVariableFor(value, this.ivarname, this));

            this.updateReadonlyConstraints();

        }

    },

    updateReadonlyConstraints: function() {

        var defVar = this.definingExternalVariable;

        this.eachExternalVariableDo(function (eVar) {

            if (eVar !== defVar) {

                eVar.setReadonly(true);

            }

        });

    },





    get currentSolver() {

        if (Constraint.current) {

            return Constraint.current.solver;

        } else {

            return null;

        }

    },





    suggestValue: function(value) {

        if (ConstrainedVariable.$$callingSetters) {

	        return value;

        }



        if (value !== this.storedValue) {

            var callSetters = !ConstrainedVariable.$$optionalSetters;

            ConstrainedVariable.$$optionalSetters = ConstrainedVariable.$$optionalSetters || [];

            try {

                if (this.isSolveable() && !ConstrainedVariable.isSuggestingValue) {

                    var wasReadonly = false,

                        eVar = this.definingExternalVariable;

                    try {

                        ConstrainedVariable.isSuggestingValue = true;

                        wasReadonly = eVar.isReadonly();

                        eVar.setReadonly(false);

                        eVar.suggestValue(value);

                        value = this.externalValue;

                    } finally {

                        eVar.setReadonly(wasReadonly);

                        ConstrainedVariable.isSuggestingValue = false;

                    }

                }

                if (value !== this.storedValue && !this.$$isStoring) {

                    this.$$isStoring = true;

                    try {

                        if (this.isSolveable()) {

                            var getterSetterPair = this.findOptionalSetter();

                            if (getterSetterPair) {

                                ConstrainedVariable.$$optionalSetters.push(getterSetterPair);

                            }

                        }

                        this.setValue(value);

                        this.updateDownstreamVariables(value);

                        this.updateConnectedVariables();

                    } finally {

                        this.$$isStoring = false;

                    }

                }

                if (callSetters) {

                    ConstrainedVariable.$$callingSetters = true;

                    var recvs = [],

                        setters = [];

                    ConstrainedVariable.$$optionalSetters.each(function (ea) {

                        var recvIdx = recvs.indexOf(ea.recv);

                        if (recvIdx === -1) {

                            recvIdx = recvs.length;

                            recvs.push(ea.recv);

                        }

                        setters[recvIdx] = setters[recvIdx] || [];

                        // If we have already called this setter for this recv, skip

                        if (setters[recvIdx].indexOf(ea.setter) !== -1) return;

                        setters[recvIdx].push(ea.setter);

                        try {

                            ea.recv[ea.setter](ea.recv[ea.getter]());

                        } catch(e) {

                            alert(e);

                        };

                    });

                    ConstrainedVariable.$$callingSetters = false;

                }

            } finally {

                if (callSetters) {

                    ConstrainedVariable.$$optionalSetters = null;

                }

            }

        }

        return value;

    },



    findOptionalSetter: function() {

        if (this.setter) {

            return {recv: this.recv, getter: this.getter, setter: this.setter};

        } else {

            if (this.parentConstrainedVariable) {

                return this.parentConstrainedVariable.findOptionalSetter()

            }

        }

    },



    get getter() {

        return this.$getter;

    },

    get recv() {

        return this.$recv;

    },

    set getter(value) {

        this.$getter = value;

        if (this.recv) {

            var setter = value.replace("get", "set");

            if (Object.isFunction(this.recv[setter])) {

                this.setter = setter;

            }

        }

    },

    set recv(value) {

        this.$recv = value;

        if (this.getter) {

            var setter = this.getter.replace("get", "set");

            if (Object.isFunction(value[setter])) {

                this.setter = setter;

            }

        }

    },

    updateConnectedVariables: function() {

        // so slow :(

        var self = this;

        this._constraints.collect(function (c) {

            return c.constraintvariables;

        }).flatten().uniqueElements().each(function (cvar) {

            cvar.suggestValue(cvar.getValue()) // will store and recurse only if needed

        });

    },



    updateDownstreamVariables: function(value) {

        var defVar = this.definingExternalVariable;

        this.eachExternalVariableDo(function (ea) {

            if (ea !== defVar) {

                ea.setReadonly(false);

                ea.suggestValue(value);

                ea.setReadonly(true);

            }

        });



        this.setValue(value);

        // recalc

        this._constraints.each(function (c) {

            var eVar = this.externalVariables(c.solver);

            if (!eVar) {

                c.recalculate();

            }

        }.bind(this));

    },





    addToConstraint: function(constraint) {

        if (!this._constraints.include(constraint)) {

            this._constraints.push(constraint);

        }

        constraint.addConstraintVariable(this);

    },

    get definingSolver() {

        if (!this.cachedDefiningSolver) {

            var solver = {weight: -1000};

            this.eachExternalVariableDo(function (eVar) {

                if (eVar) {

                    var s = eVar.__solver__;

                    if (s.weight > solver.weight) {

                        solver = s;

                    }

                }

            });

            this.cachedDefiningSolver = solver;

        }

        return this.cachedDefiningSolver;

    },

    get solvers() {

        var solvers = [];

        this.eachExternalVariableDo(function (eVar) {

            if (eVar) {

                var s = eVar.__solver__;

                solvers.push(s)

            }

        });

        return solvers;

    },

    get definingExternalVariable() {

        if (!this.cachedDefiningVar) { 

            this.cachedDefiningVar = this.externalVariables(this.definingSolver);

        }

        return this.cachedDefiningVar;

    },











    isSolveable: function() {

        return !!this.externalVariable;

    },



    get storedValue() {

        return this.obj[this.newIvarname];

    },

    get externalValue() {

        var value;

        if (typeof(this.externalVariable.value) == "function") {

            value = this.externalVariable.value();

        } else {

            value = this.externalVariable.value;

        }

        return value;

    },





    setValue: function(value) {

        this.obj[this.newIvarname] = value;

    },

    eachExternalVariableDo: function(func) {

        func.bind(this);

        for (key in this._externalVariables) {

            var eVar = this._externalVariables[key];

            if (eVar) { func(eVar, key); }

        }

    },



    getValue: function() {

        if (this.isSolveable()) {

            return this.externalValue;

        } else {

            return this.storedValue;

        }

    },





    get externalVariable() {

        if (this.currentSolver) {

            return this.externalVariables(this.currentSolver);

        } else {

            return this.definingExternalVariable;

        }

    },

    externalVariables: function(solver, value) {

        if (!solver.__uuid__) {

            solver.__uuid__ = Strings.newUUID()

        }

        if (arguments.length === 1) {

            return this._externalVariables[solver.__uuid__];

        } else {

            if (value) {

                value.__solver__ = value.__solver__ || solver;

                if (value.__cvar__ && !(value.__cvar__ === this)) {

                    throw "Inconsistent external variable. This should not happen!";

                }

                value.__cvar__ = this;

            }

            this._externalVariables[solver.__uuid__] = value || null;

        }

    }

})



users.timfelgentreff.jsinterpreter.InterpreterVisitor.subclass('ConstraintInterpreterVisitor', {









    getConstraintObjectValue: function(o) {

        if (!o.isConstraintObject) return o;

        var value = o.value;

        if (typeof(value) == "function") {

            return value.apply(o);

        } else {

            return value;

        }

    },

    errorIfUnsolvable: function(op, l, r, res) {

        if (typeof(res) == "undefined") {

            res = r;

            r = undefined;

        }

        

        if (!(l.isConstraintObject || (r && r.isConstraintObject)) ||

                Constraint.current.allowUnsolvableOperations) {

            return ((typeof(res) == "function") ? res() : res);

        } else {

            var msg = op + " not allowed on " + l;

            if (r) msg = msg + " and " + r;

            throw new Error(msg +

                ". If you want to allow this, pass `allowUnsolvableOperations' to the constraint.");

        }

    },



    visitVariable: function($super, node) {

        return $super(node);

    },



    visitCond: function($super, node) {

        var frame = this.currentFrame,

            condVal = this.visit(node.condExpr);

        if (condVal && condVal.isConstraintObject) {

            debugger

            var self = this;

            condVal = this.getConstraintObjectValue(condVal);

            if (!condVal) {

                condVal = cop.withoutLayers([ConstraintConstructionLayer], function() {

                    // XXX: this will cause GetSlot to call $super, so we don't get constrainded vars

                    return self.visit(node.condExpr);

                });

                debugger

            }

        }

        return condVal ? this.visit(node.trueExpr) : this.visit(node.falseExpr);

    },



    visitUnaryOp: function($super, node) {

        var frame = this.currentFrame,

            val = this.visit(node.expr),

            rVal = this.getConstraintObjectValue(val),

            msg = "Unary op `" + node.name + "'";

        

        switch (node.name) {

            case '-':

                if (val.isConstraintObject && val.times) {

                    return val.times(-1);

                } else {

                    return this.errorIfUnsolvable(msg, val, -rVal);

                }

            case '!':

                if (val.isConstraintObject && val.not) {

                    return val.not();

                } else {

                    return !val;

                    // return this.errorIfUnsolvable(msg, val, !val);

                }

            case '~':

                return this.errorIfUnsolvable(msg, val, ~rVal);;

            case 'typeof':

                return this.errorIfUnsolvable(msg, val, typeof(rVal));

            default:

              throw new Error('No semantics for unary op ' + node.name)

        }

    },



    invoke: function($super, node, recv, func, argValues) {

        if (!func && (!recv || !recv.isConstraintObject)) {

            var error = "No such method: " + recv + "." +  (node.property && node.property.value)

            alert(error);

            throw new Error(error);

        };

        if (recv && recv.isConstraintObject) {

            if (func) {

                var forInterpretation = func.forInterpretation;

                func.forInterpretation = undefined;

                try {

                    return cop.withoutLayers([ConstraintConstructionLayer], function() {

                        return $super(node, recv, func, argValues);

                    });

                } finally {

                    func.forInterpretation = forInterpretation;

                }

            } else {

                return this.errorIfUnsolvable(

                    "Method `" + (node.property && node.property.value) + "'",

                    recv,

                    (function () {

                        // XXX: tried to call a function on this that this constraintobject does

                        //      not understand. we'll just forward to the value, I guess?

                        debugger

                        var value = this.getConstraintObjectValue(recv);

                        var prop = this.visit(node.property);

                        return this.invoke(node, value, value[prop], argValues);

                    }).bind(this)

                );

            }

        } else if (recv === Math) {

            if (func === Math.sqrt && argValues[0].pow || argValues[0].sqrt) {

                if (argValues[0].pow) {

                    return this.invoke(node, argValues[0], argValues[0].pow, [0.5]);

                } else {

                    return this.invoke(node, argValues[0], argValues[0].sqrt, []);

                }

            } else if (func === Math.pow && argValues[0].pow) {

                return this.invoke(node, argValues[0], argValues[0].pow, [argValues[1]]);

            } else if (func === Math.sin && argValues[0].sin) {

                return this.invoke(node, argValues[0], argValues[0].sin, []);

            } else if (func === Math.cos && argValues[0].cos) {

                return this.invoke(node, argValues[0], argValues[0].cos, []);

            } else {

                return $super(node, recv, func, argValues);

            }

        } else {

            return cop.withLayers([ConstraintConstructionLayer], function() {

                return $super(node, recv, func, argValues);

            });

        }

    },

    visitBinaryOp: function($super, node) {

        var op = "Binary op `" + node.name + "'";



        // /* Only supported */ if (node.name.match(/[\*\+\/\-]|==|<=|>=|===|<|>|\|\|/)) {

        var leftVal = this.visit(node.left),

            rightVal = this.visit(node.right);

        

        if (leftVal === undefined) leftVal = 0;

        if (rightVal === undefined) rightVal = 0;

        

        var rLeftVal = leftVal.isConstraintObject ? this.getConstraintObjectValue(leftVal) : leftVal,

            rRightVal = rightVal.isConstraintObject ? this.getConstraintObjectValue(rightVal) : rightVal;                    

        switch (node.name) {

           case '+':

                if (leftVal.isConstraintObject && leftVal.plus) {

                    return leftVal.plus(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.plus) {

                    return rightVal.plus(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal + rRightVal);

                };

            case '-':

                if (leftVal.isConstraintObject && leftVal.minus) {

                    return leftVal.minus(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.plus && Object.isNumber(leftVal)) {

                    return rightVal.plus(-leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal - rRightVal);

                };

            case '*':

                if (leftVal.isConstraintObject && leftVal.times) {

                    return leftVal.times(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.times) {

                    return rightVal.times(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal * rRightVal);

                };

            case '/':

                if (leftVal.isConstraintObject && leftVal.divide) {

                    return leftVal.divide(rightVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal / rRightVal);

                };

            case '<=':

                if (leftVal.isConstraintObject && leftVal.cnLeq) {

                    return leftVal.cnLeq(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.cnGeq) {

                    return rightVal.cnGeq(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal <= rRightVal);

                };

            case '>=':

                if (leftVal.isConstraintObject && leftVal.cnGeq) {

                    return leftVal.cnGeq(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.cnLeq) {

                    return rightVal.cnLeq(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal >= rRightVal);

                };

            case '==':

                if (leftVal.isConstraintObject && leftVal.cnEquals) {

                    return leftVal.cnEquals(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.cnEquals) {

                    return rightVal.cnEquals(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal == rRightVal);

                };

            case '===':

                if (leftVal.isConstraintObject && leftVal.cnIdentical) {

                    return leftVal.cnIdentical(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.cnIdentical) {

                    return rightVal.cnIdentical(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal === rRightVal);

                };

            case '>':

                if (leftVal.isConstraintObject && leftVal.cnGreater) {

                    return leftVal.cnGreater(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.cnLess) {

                    return rightVal.cnLess(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal > rRightVal);

                };

            case '<':

                if (leftVal.isConstraintObject && leftVal.cnLess) {

                    return leftVal.cnLess(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.cnGreater) {

                    return rightVal.cnGreater(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal < rRightVal);

                };

            case '&&':

                Constraint.current.addPrimitiveConstraint(leftVal);

                dbgOn(typeof(leftVal) != "object")

                return rightVal;

            case '||':

                if (leftVal.isConstraintObject && leftVal.cnOr) {

                    return leftVal.cnOr(rightVal);

                } else if (rightVal.isConstraintObject && rightVal.cnOr) {

                    return rightVal.cnOr(leftVal);

                } else {

                    return this.errorIfUnsolvable(op, leftVal, rightVal, rLeftVal || rRightVal);

                }

            default:

                return this.errorIfUnsolvable(op, leftVal, rightVal, $super(node));

        }

    },





    visitGetSlot: function($super, node) {

        if (cop.currentLayers().indexOf(ConstraintConstructionLayer) === -1) {

            // XXX: See visitCond

            return $super(node);

        }

        

        var obj = this.visit(node.obj),

            name = this.visit(node.slotName),

            cobj = (obj ? obj[ConstrainedVariable.ThisAttrName] : undefined),

            cvar;

        if (obj === Global || (obj instanceof lively.Module)) {

            return obj[name];

        }

        if (obj && obj.isConstraintObject) {

            cobj = obj.__cvar__;

            obj = this.getConstraintObjectValue(obj);

        }



        cvar = ConstrainedVariable.newConstraintVariableFor(obj, name, cobj);

        if (Constraint.current) {

            cvar.ensureExternalVariableFor(Constraint.current.solver);

            cvar.addToConstraint(Constraint.current);

        }

        if (cvar && cvar.isSolveable()) {

            return cvar.externalVariable;

        } else {

            var retval = obj[name];

            if (retval) {

                retval[ConstrainedVariable.ThisAttrName] = cvar;

            }

            return retval;

        }

    },

    visitReturn: function($super, node) {

        var retVal = $super(node);

        if (retVal) {

            var cvar = retVal[ConstrainedVariable.ThisAttrName];

            if (retVal.isConstraintObject) {

                cvar = retVal.__cvar__;

            }

            if (cvar) {

                var parentFunc = node.parentFunction();

                if (parentFunc) {

                    cvar.getter = parentFunc.name();

                    cvar.recv = this.currentFrame.mapping["this"];

                }

            }

        }

        return retVal;

    },







    shouldInterpret: function(frame, func) {

        if (func.sourceModule === Global.users.timfelgentreff.babelsberg.constraintinterpreter) {

            return false;

        }

        if (func.declaredClass === "Babelsberg") {

            return false

        }

        var nativeClass = lively.Class.isClass(func) && func.superclass === undefined;

        return (!(this.isNative(func) || nativeClass)) &&

                 typeof(func.forInterpretation) == "function"

    },

    newObject: function($super, func) {

        if (func.original) {

            return $super(func.original);

        } else {

            return $super(func);

        }

    },



})



ConstrainedVariable.AttrName = "__constrainedVariables__";

ConstrainedVariable.ThisAttrName = "__lastConstrainedVariableForThis__";

Object.extend(ConstrainedVariable, {

    findConstraintVariableFor: function(obj, ivarname) {

        var l = obj[ConstrainedVariable.AttrName ];

        if (l && l[ivarname]) {

            return l[ivarname];

        } else {

            return null;

        }

    },



    newConstraintVariableFor: function(obj, ivarname, cobj) {

        var cvar = this.findConstraintVariableFor(obj, ivarname);

        if (!cvar) {

            cvar = new ConstrainedVariable(obj, ivarname, cobj);

            obj[ConstrainedVariable.AttrName] = obj[ConstrainedVariable.AttrName] || {};

            obj[ConstrainedVariable.AttrName][ivarname] = cvar;

        }

        return cvar;

    },

    

    deleteConstraintVariableFor: function(obj, ivarname) {

        var l = obj[ConstrainedVariable.AttrName ];

        if (l && l[ivarname]) {

            delete l[ivarname];

        }

    },



    isSuggestingValue: false,

})



ObjectLinearizerPlugin.subclass('DoNotSerializeConstraintPlugin',

'plugin interface', {

    ignoreProp: function (obj, key, value) {

        return (key === ConstrainedVariable.AttrName ||

                key === ConstrainedVariable.ThisAttrName ||

                (value instanceof Constraint))

    },

});

lively.persistence.pluginsForLively.push(DoNotSerializeConstraintPlugin);



})

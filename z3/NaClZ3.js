module('users.timfelgentreff.z3.NaClZ3').requires().toRun(function() {

    Object.subclass("NaCLZ3", {
    loadModule: function (url) {
        var owner, bounds;
        if (this.embedMorph) {
            owner = this.embedMorph.owner;
            bounds = this.embedMorph.getBounds();
            this.embedMorph.remove();
        } else {
            owner = $world;
            bounds = lively.rect(0,0,50,50);
        }
        if (!this.uuid) {
            this.uuid = new UUID().id;
        }
        this.url = url || NaCLZ3.url;
        this.embedMorph = new lively.morphic.HtmlWrapperMorph(bounds.extent());
        this.embedMorph.asJQuery().html('<div id="' + this.uuid + '">\
            <embed name="nacl_module"\
                id="' + this.uuid + 'z3"\
                width=0 height=0\
                src="' + this.url + '/z3.nmf"\
                type="application/x-nacl" />\
        </div>');
        this.embedMorph.setPosition(bounds.topLeft());
        this.embedMorph.name = "Z3Module";
        owner.addMorph(this.embedMorph);
        this.embedMorph.module = this;
        var listener = document.getElementById(this.uuid);
        listener.addEventListener('load', this.moduleDidLoad.bind(this), true);
        listener.addEventListener('message', this.handleMessage.bind(this), true);
        listener.addEventListener('crash', function () {
            alert("Z3 crashed, reloading.");
            this.loadModule(url);
        }.bind(this), true);
    },
    
    moduleDidLoad: function () {
        alertOK("NaCLZ3 loaded");
        this.module = document.getElementById(this.uuid + "z3");
        this.solve();
    },
    
    get isLoaded() {
        return !!this.module;
    },
    
    handleMessage: function (message) {
        console.log(message.data)
        this.applyResults(message.data);
    },
    applyResults: function(rawData) {
        var data = rawData.replace(/{([a-z]+):/g, "{\"$1\":").replace(/'/g, '"').replace(/\n/g, ","),
            response = JSON.parse(data.replace(/^{([a-z]):/, "{\"\1\":"));
        if (response.info) {
            console.log(response.info)
        } else if (response.error) {
            throw response.error;
        } else if (response.result) {
            var assignments = response.result.split(",").map(function (str) {
                var both = str.split("->");
                if (both.length !== 2) return;
                
                var name = both[0].trim();
                var value = this.parseAndEvalSexpr(both[1].trim());
                debugger
                if (isNaN(value)) {
                    throw "Error assigning result " + both[1].trim();
                }
                return {name: name, value: value};
            }.bind(this)).compact();
            assignments.each(function (a) {
                debugger
                this.varsByName[a.name].value = a.value;
                this.cvarsByName[a.name].suggestValue(a.value);
            }.bind(this));
        }
    },
    parseAndEvalSexpr: function(sexp) {
        var fl = parseFloat(sexp);
        if (!isNaN(fl)) return fl;
        var atomEnd = [' ', '"', "'", ')', '(', '\x0b', '\n', '\r', '\x0c', '\t']

        var stack = [],
            atom = [],
            i = 0,
            length = sexp.length;
        while (i < length) {
            var c = sexp[i]
            var reading_tuple = atom.length > 0
            if (!reading_tuple) {
                if (c == '(') {
                    stack.push([]);
                } else if (c == ')') {
                    var pred = stack.length - 2;
                    if (pred >= 0) {
                        stack[pred].push(String(this.evaluateSexpr(stack.pop())));
                    } else {
                        return this.evaluateSexpr(stack.pop());
                    }
                } else if (c.match(/\s/) !== null) {
                    // pass
                } else {
                    atom.push(c);
                }
            } else {
                if (atomEnd.indexOf(c) !== -1) {
                    stack[stack.length - 1].push(atom.join(""));
                    atom = [];
                    i -= 1; // do not skip this
                } else {
                    atom.push(c)
                }
            }
            i += 1;
        }
        throw "NotImplementedError(whatever this is) " + sexp;
    },
    evaluateSexpr: function(l) {
        var op = l[0],
            self = this,
            args = l.slice(1, l.length).map(function (arg) { return self.evalFloat(arg); });
        
        switch (op) {
            case "sin":
                return Math.sin(args[0])
            case "cos":
                return Math.cos(args[0])
            case "tan":
                return Math.tan(args[0])
            case "asin":
                return Math.asin(args[0])
            case "acos":
                return Math.acos(args[0])
            case "atan":
                return Math.atan(args[0])
            case "+":
                return args[0] + args[1]
            case "-":
                if (args.length == 1) {
                    return -args[0]
                } else {
                    return args[0] - args[1]
                }
            case "*":
                return args[0] * args[1]
            case "/":
                return args[0] / args[1]
            case "^":
                return Math.pow(args[0], args[1])
            case "root-obj":
                // ignore imaginary part
                return args[0];
            default:
                throw op + ' in sexprs returned from Z3'
        }
    },
    evalFloat: function(arg) {
        if (arg.match(/\//)) {
            var nomden = arg.split("/")
            return parseFloat(nomden[0])/parseFloat(nomden[1]);
        } else {
            return parseFloat(arg);
        }
    },
    
    postMessage: function (string) {
        if (!this.isLoaded) {
            alert("Z3 not ready, will solve when loaded.");
        } else {
            console.log(string)
            this.module.postMessage(
                "(set-option :pp.decimal true)\n(set-option :model true)" +
                string
            );
        }
    },
    initialize: function(url) {
        this.loadModule(url);
        this.variables = [];
        this.cvarsByName = {};
        this.varsByName = {};
        this.constraints = [];
    },
    always: function(opts, func) {
        if (opts.priority) {
            throw "soft constraints not implemented for Z3";
        }
        func.varMapping = opts.ctx;
        var constraint = new Constraint(func, this);
        constraint.enable();
        return constraint;
    },
    constraintVariableFor: function(value, ivarname, cvar) {
        if ((typeof(value) == "number") || (value === null) || (value instanceof Number)) {
            var name = ivarname + "" + this.variables.length;
            var v = new NaCLZ3Variable(name, value + 0 /* coerce back into primitive */, this);
            this.addVariable(v, cvar);
            return v;
        } else {
            return null;
        }
    },
    isConstraintObject: function() {
        return true;
    },
    get strength() {
        throw "strength (and soft constraints) not implemented for Z3, yet"
    },
    weight: 500,
    solveOnce: function(c) {
        this.addConstraint(c);
        try {
            this.solve();
        } finally {
            this.removeConstraint(c);
        }
    },
    
    addVariable: function(v, cvar) {
        this.variables.push(v);
        this.cvarsByName[v.name] = cvar;
        this.varsByName[v.name] = v;
    }
    ,
    addConstraint: function(c) {
        this.constraints.push(c);
    },
    removeConstraint: function(c) {
        this.constraints.remove(c);
    },
    solve: function () {
        var decls = [""].concat(this.variables).reduce(function (acc, v) {
            return acc + "\n" + v.printDeclaration();
        });
        var constraints = ["\n"].concat(this.constraints).reduce(function (acc, c) {
            return acc + "\n" + "(assert " + c.print() + ")";
        });
        this.postMessage(decls + constraints);
        return decls + constraints;
    },
});

    NaCLZ3.url = URL.codeBase.withFilename(module('users.timfelgentreff.z3.NaClZ3').relativePath()).dirname();

    Object.subclass('NaCLZ3Ast', {
    cnEquals: function (r) {
        return new NaCLZ3BinaryExpression("=", this, r, this.solver);
    },
    cnGeq: function (r) {
        return new NaCLZ3BinaryExpression(">=", this, r, this.solver);
    },
    cnGreater: function (r) {
        return new NaCLZ3BinaryExpression(">", this, r, this.solver);
    },
    cnLeq: function (r) {
        return new NaCLZ3BinaryExpression("<=", this, r, this.solver);
    },
    cnLess: function (r) {
        return new NaCLZ3BinaryExpression("<", this, r, this.solver);
    },
    divide: function (r) {
        return new NaCLZ3BinaryExpression("/", this, r, this.solver);
    },
    times: function (r) {
        return new NaCLZ3BinaryExpression("*", this, r, this.solver);
    },
    sin: function() {
        return  this.minus(
                this.pow(3).divide(6)).plus(
                this.pow(5).divide(120)).minus(
                this.pow(7).divide(5040)).plus(
                this.pow(9).divide(362880)).minus(
                this.pow(11).divide(39916800)).plus(
                this.pow(13).divide(6227020800)).minus(
                this.pow(15).divide(1307674400000)).plus(
                this.pow(17).divide(355687430000000))
        // Z3 supports sin, but then many systems cannot be solved,
        // so we approximate using Taylor
        // return new NaCLZ3UnaryExpression("sin", this, this.solver);
    },
    cos: function() {
        return this.plus(Math.PI / 2).sin();
        // Z3 supports cos, but then many systems cannot be solved,
        // so we approximate using Taylor. We go through Taylor-sin, to
        // avoid issues with imaginary components, because Taylor-cos uses even powers
        // return new NaCLZ3UnaryExpression("cos", this, this.solver);
    },
    minus: function (r) {
        return new NaCLZ3BinaryExpression("-", this, r, this.solver);
    },
    print: function() {
        throw "my subclass should have overridden `print'"
    },
    plus: function (r) {
        return new NaCLZ3BinaryExpression("+", this, r, this.solver);
    },
    pow: function (r) {
        return new NaCLZ3BinaryExpression("^", this, r, this.solver);
    },
    isConstraintObject: function() {
        return true;
    },
    });

    NaCLZ3Ast.subclass('NaCLZ3Variable', {
    initialize: function(name, value, solver) {
        this.name = name;
        this.value = value;
        this.solver = solver;
    },
    stay: function(strength) {
        throw "stay constraints not implemented for Z3 (yet)"
    },
    removeStay: function() {
        // throw "stay constraints not implemented for Z3 (yet)"
        // pass
    },
    suggestValue: function(value) {
        if (value === this.value) return;

        var c = this.cnEquals(value);
        this.solver.solveOnce(c);
    },
    setReadonly: function(bool) {
        if (bool && !this.readonlyConstraint) {
            var cn = this.cnEquals(this.value);
            this.solver.addConstraint(cn);
            this.readonlyConstraint = cn;
            return cn;
        } else if (!bool && this.readonlyConstraint) {
            this.solver.removeConstraint(this.readonlyConstraint);
            this.readonlyConstraint = undefined;
        }
    },
    isReadonly: function() {
        return !!this.readonlyConstraint;
    },
    cnIdentical: function(value) {
        return this.cnEquals(value); // the same for numbers
    },
    
    print: function() {
        return this.name;
    },
    printDeclaration: function() {
        return "(declare-fun " + this.name + " () Real)"
    },
    
    prepareEdit: function() {
        throw "Z3 does not support editing"
    },
    finishEdit: function() {
        throw "Z3 does not support editing"
    },
    });

NaCLZ3Ast.subclass('NaCLZ3Constant', {
    initialize: function (value, solver) {
        this.value = value;
        this.solver = solver;
    },
    
    print: function () {
        return "" + this.value;
    }
});

NaCLZ3Ast.subclass('NaCLZ3Constraint', {
    enable: function (strength) {
        if (strength && strength !== "required") {
            throw "Z3 does not support soft constraints (yet)"
        }
        this.solver.addConstraint(this);
    },

    disable: function () {
        this.solver.removeConstraint(this);
    },
});

NaCLZ3Constraint.subclass('NaCLZ3BinaryExpression', {
    initialize: function (op, left, right, solver) {
        this.solver = solver;
        this.op = op;
        this.left = this.z3object(left);
        this.right = this.z3object(right);
    },
    z3object: function(obj) {
        if (obj instanceof NaCLZ3Ast) {
            return obj;
        } else {
            return new NaCLZ3Constant(parseFloat(obj), this.solver);
        }
    },
    print: function () {
        return "(" + this.op + " " + this.left.print() + " " + this.right.print() + ")"
    }
});

NaCLZ3Constraint.subclass('NaCLZ3UnaryExpression', {
    initialize: function (op, arg,  solver) {
        this.solver = solver;
        this.op = op;
        this.arg = arg;
    },
    print: function () {
        return "(" + this.op + " " + this.arg.print() + ")"
    }
});
}) // end of module

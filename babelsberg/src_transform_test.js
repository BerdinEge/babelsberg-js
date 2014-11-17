module('users.timfelgentreff.babelsberg.src_transform_test').requires('lively.TestFramework', 'users.timfelgentreff.standalone.Compressor').toRun(function() {

TestCase.subclass('users.timfelgentreff.babelsberg.src_transform_test.TransformTest', {


    testAssignResult: function () {
        var src = "always: {store: c; a < b}";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        this.assert(result === "c=bbb.always({ctx:{c:c,a:a,b:b,_$_self:this.doitContext||this}},function(){returna<b;;});", result);
    },

    testObjectEditorTransform1: function () {
        var src = "always: {a < b}";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        this.assert(result === "bbb.always({ctx:{a:a,b:b,_$_self:this.doitContext||this}},function(){returna<b;;});", result);
    },
    testObjectEditorTransform2: function () {
        var src = "always: {solver: cassowary; priority: 'high'; a < b}";
        var result = new BabelsbergSrcTransform().transform(src);
        result = result.replace(/[ \n\r\t]/g,"");
        this.assert(result === "bbb.always({solver:cassowary,priority:\"high\",ctx:{cassowary:cassowary,a:a,b:b,_$_self:this.doitContext||this}},function(){returna<b;;});", result);
    },
    testOETransformWithLaterDeclarations: function () {
        var src = "always: { true }\n\
                    var late;\n";
        var result = new BabelsbergSrcTransform().transform(src);
        // asserts correct indenting, too
        this.assert(result === "bbb.always({\n" +
                               "    ctx: {\n" +
                               "        _$_self: this.doitContext || this\n" +
                               "    }\n" +
                               "}, function() {\n" +
                               "    return true;;\n" +
                               "});\n" +
                               "\n" +
                               "var late;", result);
    },
    testSCBTransform: function () {
        var src = "always: {solver: cassowary; priority: 'high'; a < b}",
            panel = new lively.ide.BrowserPanel(pt(100,100)),
            editor = new lively.morphic.CodeEditor(rect(0,0,100,100), "    " + src);
        panel.addMorph(editor);
        editor.evalEnabled = false;
        
        cop.withLayers([ConstraintSyntaxLayer], function () {
            editor.doSave();
        });
        // asserts correct indenting, too
        this.assert(editor.textString === "    bbb.always({\n" +
                                          "        solver: cassowary,\n" +
                                          "        priority: \"high\",\n" +
                                          "        ctx: {\n" +
                                          "            cassowary: cassowary,\n" +
                                          "            a: a,\n" +
                                          "            b: b,\n" +
                                          "            _$_self: this.doitContext || this\n" +
                                          "        }\n" +
                                          "    }, function() {\n" +
                                          "        return a < b;;\n" +
                                          "    });", editor.textString);
    },
    testConvertAddScript: function() {
        var src = "this.addScript(function () { foo })";
        var result = new BabelsbergSrcTransform().transformAddScript(src);
        result = result.replace(/[ \n\r\t]/g,"");
        this.assert(result === "this.addScript(function(){foo;},\"function(){foo}\");", result);
    }
});
TestCase.subclass('users.timfelgentreff.babelsberg.src_transform_test.MinifyTest', {
    testBuildMinifiedJs: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["prototypejs", "core", "cassowary", "deltablue", "csp"], "babelsberg_mini_prototype");
    },
    testBuildMinifiedJs1: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["core", "cassowary", "deltablue", "csp"], "babelsberg_mini");
    },
    testBuildMinifiedJs2: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["core"], "babelsberg_core");
    },
    testBuildMinifiedJs3: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["deltablue"], "babelsberg_deltablue");
    },
    testBuildMinifiedJs4: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["cassowary"], "babelsberg_cassowary");
    },
    testBuildMinifiedJs5: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["csp"], "babelsberg_csp");
    },
    testBuildMinifiedJs6: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["sutherland"], "babelsberg_sutherland");
    },
    testBuildMinifiedJs7: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["reactive"], "babelsberg_reactive");
    },
    testBuildMinifiedJs8: function () {
        module("users.timfelgentreff.standalone.Compressor").load(true);
        users.timfelgentreff.standalone.Compressor.doAction(["z3"], "babelsberg_z3");
    },
});

}) // end of module

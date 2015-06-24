/*global require, global, ui:false*/

require('../ui');
require('../../chem');
require('../../util');

var ui = global.ui = global.ui || function () {}; // jshint ignore:line
var chem = global.chem;
var util = global.util;

ui.initDialogs = function () {
    // Label input events
    $('input_label').observe('blur', function () {
        this.hide();
    });
    $('input_label').observe('keypress', ui.onKeyPress_InputLabel);
    $('input_label').observe('keyup', ui.onKeyUp_InputLabel);

    // Atom properties dialog events
    $('atom_label').observe('change', ui.onChange_AtomLabel);
    $('atom_charge').observe('change', ui.onChange_AtomCharge);
    $('atom_isotope').observe('change', ui.onChange_AtomIsotope);
    $('atom_valence').observe('change', ui.onChange_AtomValence);
    $('atom_prop_cancel').observe('click', function () {
        ui.hideDialog('atom_properties');
    });
    $('atom_prop_ok').observe('click', function () {
        ui.applyAtomProperties();
    });
    $('bond_prop_cancel').observe('click', function () {
        ui.hideDialog('bond_properties');
    });
    $('bond_prop_ok').observe('click', function () {
        ui.applyBondProperties();
    });
};

//
// Atom attachment points dialog
//
ui.showAtomAttachmentPoints = function (params) {
    $('atom_ap1').checked = ((params.selection || 0) & 1) > 0;
    $('atom_ap2').checked = ((params.selection || 0) & 2) > 0;
    ui.showDialog('atom_attpoints');
    var _onOk = new Event.Handler('atom_attpoints_ok', 'click', undefined, function () {
        _onOk.stop();
        _onCancel.stop();
        ui.hideDialog('atom_attpoints');
        if ('onOk' in params) {
            params.onOk(($('atom_ap1').checked ? 1 : 0) + ($('atom_ap2').checked ? 2 : 0));
        }
    }).start();
    var _onCancel = new Event.Handler('atom_attpoints_cancel', 'click', undefined, function () {
        _onOk.stop();
        _onCancel.stop();
        ui.hideDialog('atom_attpoints');
        if ('onCancel' in params) {
            params.onCancel();
        }
    }).start();
    $('atom_attpoints_ok').focus();
};

//
// Atom properties dialog
//
ui.showAtomProperties = function (id) {
    $('atom_properties').atom_id = id;
    $('atom_label').value = ui.render.atomGetAttr(id, 'label');
    ui.onChange_AtomLabel.call($('atom_label'));
    var value = ui.render.atomGetAttr(id, 'charge') - 0;
    $('atom_charge').value = (value == 0 ? '' : value);
    value = ui.render.atomGetAttr(id, 'isotope') - 0;
    $('atom_isotope').value = (value == 0 ? '' : value);
    value = ui.render.atomGetAttr(id, 'explicitValence') - 0;
    $('atom_valence').value = value < 0 ? '' : value;
    $('atom_radical').value = ui.render.atomGetAttr(id, 'radical');

    $('atom_inversion').value = ui.render.atomGetAttr(id, 'invRet');
    $('atom_exactchange').value = ui.render.atomGetAttr(id, 'exactChangeFlag') ? 1 : 0;
    $('atom_ringcount').value = ui.render.atomGetAttr(id, 'ringBondCount');
    $('atom_substitution').value = ui.render.atomGetAttr(id, 'substitutionCount');
    $('atom_unsaturation').value = ui.render.atomGetAttr(id, 'unsaturatedAtom');
    $('atom_hcount').value = ui.render.atomGetAttr(id, 'hCount');

    ui.showDialog('atom_properties');
    $('atom_label').activate();
};

ui.applyAtomProperties = function () {
    ui.hideDialog('atom_properties');

    var id = $('atom_properties').atom_id;

    ui.addUndoAction(ui.Action.fromAtomsAttrs(id,
        {
            label: $('atom_label').value,
            charge: $('atom_charge').value == '' ? 0 : parseInt($('atom_charge').value, 10),
            isotope: $('atom_isotope').value == '' ? 0 : parseInt($('atom_isotope').value, 10),
            explicitValence: $('atom_valence').value == '' ? -1 : parseInt($('atom_valence').value, 10),
            radical: parseInt($('atom_radical').value, 10),
            // reaction flags
            invRet: parseInt($('atom_inversion').value, 10),
            exactChangeFlag: parseInt($('atom_exactchange').value, 10) ? true : false,
            // query flags
            ringBondCount: parseInt($('atom_ringcount').value, 10),
            substitutionCount: parseInt($('atom_substitution').value, 10),
            unsaturatedAtom: parseInt($('atom_unsaturation').value, 10),
            hCount: parseInt($('atom_hcount').value, 10)
        }), true);

    ui.render.update();
};

ui.onChange_AtomLabel = function () {
    this.value = this.value.strip().capitalize();

    var element = chem.Element.getElementByLabel(this.value);

    if (
        element == null && this.value !== 'A' &&
        this.value !== '*' && this.value !== 'Q' && this.value !== 'X' &&
        this.value !== 'R'
    ) {
        this.value = ui.render.atomGetAttr($('atom_properties').atom_id, 'label');

        if (this.value !== 'A' && this.value !== '*') {
            element = chem.Element.getElementByLabel(this.value);
        }
    }

    if (this.value == 'A' || this.value == '*') {
        $('atom_number').value = 'any';
    } else if (!element) {
        $('atom_number').value = '';
    } else {
        $('atom_number').value = element.toString();
    }
};

ui.onChange_AtomCharge = function () {
    if (this.value.strip() === '' || this.value == '0') {
        this.value = '';
    } else if (this.value.match(/^[1-9][0-9]{0,1}[-+]$/)) {
        this.value = (this.value.endsWith('-') ? '-' : '') + this.value.substr(0, this.value.length - 1);
    } else if (!this.value.match(/^[+-]?[1-9][0-9]{0,1}$/)) {
        this.value = ui.render.atomGetAttr($('atom_properties').atom_id, 'charge');
    }
};

ui.onChange_AtomIsotope = function () {
    if (this.value == util.getElementTextContent($('atom_number')) || this.value.strip() == '' || this.value == '0') {
        this.value = '';
    } else if (!this.value.match(/^[1-9][0-9]{0,2}$/)) {
        this.value = ui.render.atomGetAttr($('atom_properties').atom_id, 'isotope');
    }
};

ui.onChange_AtomValence = function () {
    /*
     if (this.value.strip() == '')
     this.value = '';
     else if (!this.value.match(/^[0-9]$/))
     this.value = ui.render.atomGetAttr($('atom_properties').atom_id, 'valence');
     */
};

//
// Bond properties dialog
//
ui.showBondProperties = function (id) {
    var bond;
    $('bond_properties').bond_id = id;

    var type = ui.render.bondGetAttr(id, 'type');
    var stereo = ui.render.bondGetAttr(id, 'stereo');

    for (bond in ui.bondTypeMap) {
        if (ui.bondTypeMap[bond].type == type && ui.bondTypeMap[bond].stereo == stereo) {
            break;
        }
    }

    $('bond_type').value = bond;
    $('bond_topology').value = ui.render.bondGetAttr(id, 'topology') || 0;
    $('bond_center').value = ui.render.bondGetAttr(id, 'reactingCenterStatus') || 0;

    ui.showDialog('bond_properties');
    $('bond_type').activate();
};

ui.applyBondProperties = function () {
    ui.hideDialog('bond_properties');

    var id = $('bond_properties').bond_id;
    var bond = Object.clone(ui.bondTypeMap[$('bond_type').value]);

    bond.topology = parseInt($('bond_topology').value, 10);
    bond.reactingCenterStatus = parseInt($('bond_center').value, 10);

    ui.addUndoAction(ui.Action.fromBondAttrs(id, bond), true);

    ui.render.update();
};

//
// Reaction auto-mapping
//

ui.showAutomapProperties = function (params) {
    ui.showDialog('automap_properties');
    var _onOk;
    var _onCancel;

    _onOk = new Event.Handler('automap_ok', 'click', undefined, function () {
        _onOk.stop();
        _onCancel.stop();
        if (params && 'onOk' in params) params['onOk']($('automap_mode').value);
        ui.hideDialog('automap_properties');
    }).start();

    _onCancel = new Event.Handler('automap_cancel', 'click', undefined, function() {
        _onOk.stop();
        _onCancel.stop();
        ui.hideDialog('automap_properties');
        if (params && 'onCancel' in params) params['onCancel']();
    }).start();

    $('automap_mode').activate();
};

ui.showRLogicTable = function (args) {
    var params = args || {};
    params.rlogic = params.rlogic || {};
    $('rlogic_occurrence').value = params.rlogic.occurrence || '>0';
    $('rlogic_resth').value = params.rlogic.resth ? '1' : '0';
    var ifOptHtml = '<option value="0">Always</option>';
    for (var r = 1; r <= 32; r++) {
        if (r != params.rgid && (params.rgmask & (1 << (r - 1))) != 0) {
            ifOptHtml += '<option value="' + r + '">IF R' + params.rgid + ' THEN R' + r + '</option>';
        }
    }
    $('rlogic_if').outerHTML = '<select id="rlogic_if">' + ifOptHtml + '</select>'; // [RB] thats tricky because IE8 fails to set innerHTML
    $('rlogic_if').value = params.rlogic.ifthen;
    ui.showDialog('rlogic_table');

    var _onOk = new Event.Handler('rlogic_ok', 'click', undefined, function () {
        var result = {
            'occurrence': $('rlogic_occurrence').value
                .replace(/\s*/g, '').replace(/,+/g, ',').replace(/^,/, '').replace(/,$/, ''),
            'resth': $('rlogic_resth').value == '1',
            'ifthen': parseInt($('rlogic_if').value, 10)
        };
        if (!params || !('onOk' in params) || params.onOk(result)) {
            _onOk.stop();
            _onCancel.stop();
            ui.hideDialog('rlogic_table');
        }
    }).start();
    var _onCancel = new Event.Handler('rlogic_cancel', 'click', undefined, function() {
        _onOk.stop();
        _onCancel.stop();
        ui.hideDialog('rlogic_table');
        if (params && 'onCancel' in params) params['onCancel']();
    }).start();

    $('rlogic_occurrence').activate();
};

ui.onKeyPress_Dialog = function (event)
{
    util.stopEventPropagation(event);
    if (event.keyCode === 27) {
        ui.hideDialog(this.id);
        return util.preventDefault(event);
    }
};

ui.onKeyPress_InputLabel = function (event)
{
    util.stopEventPropagation(event);
    if (event.keyCode == 13) {
        this.hide();

        var label = '';
        var charge = 0;
        var value_arr = this.value.toArray();

        if (this.value == '*') {
            label = 'A';
        }
        else if (this.value.match(/^[*][1-9]?[+-]$/i)) {
            label = 'A';

            if (this.value.length == 2)
                charge = 1;
            else
                charge = parseInt(value_arr[1]);

            if (value_arr[2] == '-')
                charge *= -1;
        }
        else if (this.value.match(/^[A-Z]{1,2}$/i)) {
            label = this.value.capitalize();
        }
        else if (this.value.match(/^[A-Z]{1,2}[0][+-]?$/i)) {
            if (this.value.match(/^[A-Z]{2}/i))
                label = this.value.substr(0, 2).capitalize();
            else
                label = value_arr[0].capitalize();
        }
        else if (this.value.match(/^[A-Z]{1,2}[1-9]?[+-]$/i)) {
            if (this.value.match(/^[A-Z]{2}/i))
                label = this.value.substr(0, 2).capitalize();
            else
                label = value_arr[0].capitalize();

            var match = this.value.match(/[0-9]/i);

            if (match != null)
                charge = parseInt(match[0]);
            else
                charge = 1;

            if (value_arr[this.value.length - 1] == '-')
                charge *= -1;
        }

        if (label == 'A' || label == 'Q' || label == 'X' || label == 'R' || chem.Element.getElementByLabel(label) != null) {
            ui.addUndoAction(ui.Action.fromAtomsAttrs(this.atom_id, {label: label, charge: charge}), true);
            ui.render.update();
        }
        return util.preventDefault(event);
    }
    if (event.keyCode == 27) {
        this.hide();
        return util.preventDefault(event);
    }
};

ui.onKeyUp_InputLabel = function (event)
{
    util.stopEventPropagation(event);
    if (event.keyCode == 27) {
        this.hide();
        return util.preventDefault(event);
    }
};

ui.showLabelEditor = function(aid)
{
    // TODO: RB: to be refactored later, need to attach/detach listeners here as anon-functions, not on global scope (ui.onKeyPress_InputLabel, onBlur, etc)
    var input_el = $('input_label');

    var offset = Math.min(6 * ui.zoom, 16);

    input_el.atom_id = aid;
    input_el.value = ui.render.atomGetAttr(aid, 'label');
    input_el.style.fontSize = (offset * 2).toString() + 'px';

    input_el.show();

    var atom_pos = ui.render.obj2view(ui.render.atomGetPos(aid));
    var offset_client = ui.client_area.cumulativeOffset();
    var offset_parent = Element.cumulativeOffset(input_el.offsetParent);
    var d = 0; // TODO: fix/Math.ceil(4 * ui.abl() / 100);
    input_el.style.left = (atom_pos.x + offset_client.left - offset_parent.left - offset - d).toString() + 'px';
    input_el.style.top = (atom_pos.y + offset_client.top - offset_parent.top - offset - d).toString() + 'px';

    input_el.activate();
};
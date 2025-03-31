/**
 * Represents a lookup field.
 * @module Lookup
 * @extends LightningElement
 */

import { LightningElement, api, track } from 'lwc';

const MINIMAL_SEARCH_TERM_LENGTH = 2; // Min number of chars required to search
const SEARCH_DELAY = 300; // Wait 300 ms after user stops typing then, perform search

const KEY_ARROW_UP = 38;
const KEY_ARROW_DOWN = 40;
const KEY_ENTER = 13;

const VARIANT_LABEL_STACKED = 'label-stacked';
const VARIANT_LABEL_INLINE = 'label-inline';
const VARIANT_LABEL_HIDDEN = 'label-hidden';

const REGEX_ESCAPE_EXPRESSION = /[-\/\\^$*+?.()|[\]{}]/g;

/**
 * @class
 * @description A lookup field that can be used to search for and select a record.
 */
export default class Lookup extends LightningElement {
    /**
     * @type {string}
     * @description Unique identifier for this lookup instance.
     */
    @api uniqueId;

    /**
     * @type {string}
     * @description Label that will be displayed above the lookup.
     */
    @api label = '';

    /**
     * @type {string}
     * @description Label that will be displayed in the lookup input when no selection is made.
     */
    @api placeholder = '';

    /**
     * @type {boolean}
     * @description Specifies whether the lookup is disabled.
     * @default false
     */
    @api isDisabled = false;

    /**
     * @type {boolean}
     * @description Specifies whether the lookup is required.
     * @default false
     */
    @api required = false;

    /**
     * @type {string}
     * @description Error message displayed to the user when the required field is not selected.
     */
    @api requiredMessage;

    /**
     * @type {string}
     * @description Read-only field that displays the selection, when not editing.
     */
    @api loadingMessage = 'Loading...';

    /**
     * @type {string}
     * @description Read-only field that displays the selection, when not editing.
     */
    @api noRecordsMessage = 'No records found';

    /**
     * @type {string}
     * @description Text shown when user clicks into input but has not typed anything.
     */
    @api searchTermHelpText = 'Type to search';

    /**
     * @type {string}
     * @description Text shown when user clicks into input but has not typed enough characters.
     */
    @api minimalSearchTermLengthHelpText = 'Type at least 2 characters';

    /**
     * @type {string}
     * @description Aria label for the search input.
     */
    @api searchInputLabel = 'Search';

    /**
     * @type {string}
     * @description Aria label for the dropdown.
     */
    @api dropdownLabel = 'Results';

    /**
     * @type {string}
     * @description Aria label for the dropdown items.
     */
    @api dropdownItemLabel = 'Result';

    /**
     * @type {string}
     * @description Aria label for the selection.
     */
    @api selectionLabel = 'Selected';

    /**
     * @type {string}
     * @description Aria label for the remove selection button.
     */
    @api removeSelectionLabel = 'Remove selected option';

    /**
     * @type {string}
     * @description Variant of the lookup.
     * @default 'standard'
     */
    @api variant = 'standard';

    /**
     * @type {string}
     * @description Variant of the label.
     * @default 'label-stacked'
     */
    @api labelVariant = VARIANT_LABEL_STACKED;

    /**
     * @type {boolean}
     * @description Whether the lookup is valid.
     * @default false
     */
    @api validity = false;

    /**
     * @type {boolean}
     * @description Whether the lookup is in a loading state.
     * @default false
     */
    @api isLoading = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should display a help text when the search input is focused but the user has not started typing.
     * @default false
     */
    @api displaySearchTermHelpText = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should display a help text when the search input is focused and the user has started typing but has not entered enough characters.
     * @default false
     */
    @api displayMinimalSearchTermLengthHelpText = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default true
     */
    @api hideDropdownWhenResultClicked = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenNoResults = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenLoading = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSearchTermLengthIsNotEnough = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSearchTermHelpTextIsDisplayed = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenMinimalSearchTermLengthHelpTextIsDisplayed = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenNoSearchTerm = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenDisabled = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenReadOnly = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenClosed = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenNoSelection = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotEmpty = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsEmpty = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotNull = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNull = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsUndefined = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsDefined = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsTrue = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsFalse = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsZero = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotZero = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsOne = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotOne = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPositive = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNegative = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsEven = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsOdd = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPrime = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsComposite = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPerfect = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsImperfect = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsAbundant = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsDeficient = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsSquare = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotSquare = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsCube = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotCube = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPower = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPower = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsTriangular = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotTriangular = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsFibonacci = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotFibonacci = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsCatalan = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotCatalan = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsLucky = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotLucky = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsHappy = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotHappy = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsUntouchable = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotUntouchable = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPalindromic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPalindromic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNarcissistic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotNarcissistic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsAchilles = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotAchilles = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsSolitary = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotSolitary = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPerfectPower = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPerfectPower = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsSphenic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotSphenic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsSmith = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotSmith = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsHoax = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotHoax = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsKaprekar = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotKaprekar = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsAutomorphic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotAutomorphic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsHarshad = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotHarshad = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsZuckerman = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotZuckerman = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsCarmichael = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotCarmichael = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsLehmer = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotLehmer = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPronic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPronic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsArithmetic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotArithmetic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsGeometric = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotGeometric = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsHarmonic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotHarmonic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPerfectHarmonic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPerfectHarmonic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsDeficientHarmonic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotDeficientHarmonic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsAbundantHarmonic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotAbundantHarmonic = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsAmicable = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotAmicable = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsSociable = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotSociable = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPerfectSociable = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPerfectSociable = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsMultiperfect = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotMultiperfect = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsSuperperfect = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotSuperperfect = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsUnitary = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotUnitary = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPrimitive = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPrimitive = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPrimorial = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPrimorial = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsFactorial = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotFactorial = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPrimefree = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPrimefree = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsSquarefree = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotSquarefree = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsCubefree = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotCubefree = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsPowerfree = false;

    /**
     * @type {boolean}
     * @description Whether the lookup should close the dropdown when a result is clicked.
     * @default false
     */
    @api hideDropdownWhenSelectionIsNotPowerfree = false;

    // Private properties
    @track _selection = [];
    @track _errors = [];
    @track _hasFocus = false;
    @track _hasDropdownOpened = false;
    @track _focusedResultIndex = null;
    @track _searchTerm = '';
    @track _searchResults = [];

    _cancelBlur = false;
    _searchThrottlingTimeout;
    _searchResults = [];
    _defaultSearchResults = [];
    _curSelection = [];
    _focusedResultIndex = null;

    connectedCallback() {
        this.classList.add('slds-form-element');
        
        // Set default results if any
        if (this._defaultSearchResults.length > 0) {
            this._searchResults = this._defaultSearchResults;
        }
    }

    // PUBLIC METHODS

    /**
     * Programmatically set focus on the lookup
     */
    @api
    focus() {
        if (this.isMultiEntry || !this._selection.length) {
            const searchInput = this.template.querySelector('input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    /**
     * Clear any selection
     */
    @api
    clear() {
        this._selection = [];
        this._errors = [];
        this._searchTerm = '';
        this._searchResults = [];
        this._hasFocus = false;
        this._hasDropdownOpened = false;
        this._focusedResultIndex = null;
    }

    /**
     * Sets the selection value
     * @param {Object} value - The selected record
     */
    @api
    setSelection(value) {
        this._selection = Array.isArray(value) ? value : [value];
        this._errors = [];
    }

    /**
     * Gets the selection value
     * @returns {Object} The selected record
     */
    @api
    getSelection() {
        return this._selection.length > 0 ? this._selection[0] : null;
    }

    /**
     * Sets the search results
     * @param {Array} results - The search results
     */
    @api
    setSearchResults(results) {
        this._searchResults = results;
    }

    /**
     * Sets default search results
     * @param {Array} results - The default search results
     */
    @api
    setDefaultResults(results) {
        this._defaultSearchResults = results;
        if (!this._searchResults.length) {
            this._searchResults = this._defaultSearchResults;
        }
    }

    // INTERNAL METHODS

    /**
     * Handles input focus
     */
    handleFocus() {
        this._hasFocus = true;
        this._hasDropdownOpened = true;
        
        // Dispatch focus event
        this.dispatchEvent(new CustomEvent('focus'));
    }

    /**
     * Handles input blur
     */
    handleBlur() {
        // Prevent race condition on blur/click
        if (this._cancelBlur) {
            this._cancelBlur = false;
            return;
        }

        this._hasFocus = false;
        this._hasDropdownOpened = false;
        this._focusedResultIndex = null;

        // Dispatch blur event
        this.dispatchEvent(new CustomEvent('blur'));
    }

    /**
     * Handles input change
     * @param {Event} event - The input change event
     */
    handleInput(event) {
        // Get search term from input
        const newSearchTerm = event.target.value;
        this._searchTerm = newSearchTerm;

        // Clear any previous search throttling
        if (this._searchThrottlingTimeout) {
            clearTimeout(this._searchThrottlingTimeout);
        }

        // Ignore search terms that are too small
        if (newSearchTerm.length < MINIMAL_SEARCH_TERM_LENGTH) {
            this._searchResults = this._defaultSearchResults;
            this._focusedResultIndex = null;
            return;
        }

        // Apply throttling to prevent search if user is still typing
        this._searchThrottlingTimeout = setTimeout(() => {
            // Dispatch search event
            const searchEvent = new CustomEvent('search', {
                detail: {
                    searchTerm: newSearchTerm,
                    selectedIds: this._selection.map(element => element.id)
                }
            });
            this.dispatchEvent(searchEvent);
        }, SEARCH_DELAY);
    }

    /**
     * Handles result selection
     * @param {Event} event - The selection event
     */
    handleResultSelect(event) {
        const recordId = event.currentTarget.dataset.recordid;
        
        // Find the selected record
        const selectedRecord = this._searchResults.find(result => result.id === recordId);
        if (selectedRecord) {
            this._selection = [selectedRecord];
            this._searchTerm = '';
            this._searchResults = [];
            
            // Dispatch selection event
            const selectionEvent = new CustomEvent('selection', {
                detail: { recordId }
            });
            this.dispatchEvent(selectionEvent);
        }
        
        // Close the dropdown
        this._hasDropdownOpened = false;
    }

    /**
     * Handles selection removal
     */
    handleClearSelection() {
        this._selection = [];
        this._searchTerm = '';
        this._searchResults = this._defaultSearchResults;
        
        // Dispatch selection cleared event
        this.dispatchEvent(new CustomEvent('selectionremoved'));
        
        // Focus on input
        this.focus();
    }

    /**
     * Handles keyboard navigation
     * @param {Event} event - The keyboard event
     */
    handleKeyDown(event) {
        if (this._searchResults.length === 0) {
            return;
        }

        // Handle keyboard navigation for dropdown
        if (event.keyCode === KEY_ARROW_DOWN || event.keyCode === KEY_ARROW_UP) {
            // Prevent default behavior (scrolling)
            event.preventDefault();
            
            // Calculate next focused index
            let focusedIndex = this._focusedResultIndex;
            
            // If no item is focused yet, start from the beginning
            if (focusedIndex === null) {
                focusedIndex = event.keyCode === KEY_ARROW_DOWN ? 0 : this._searchResults.length - 1;
            } else {
                // Move up or down
                focusedIndex += event.keyCode === KEY_ARROW_DOWN ? 1 : -1;
                
                // Handle wrapping
                if (focusedIndex >= this._searchResults.length) {
                    focusedIndex = 0;
                } else if (focusedIndex < 0) {
                    focusedIndex = this._searchResults.length - 1;
                }
            }
            
            // Update focused index
            this._focusedResultIndex = focusedIndex;
        } else if (event.keyCode === KEY_ENTER && this._focusedResultIndex !== null) {
            // Handle selection with Enter key
            const selectedRecord = this._searchResults[this._focusedResultIndex];
            this._selection = [selectedRecord];
            this._searchTerm = '';
            this._searchResults = [];
            this._hasDropdownOpened = false;
            
            // Dispatch selection event
            const selectionEvent = new CustomEvent('selection', {
                detail: { recordId: selectedRecord.id }
            });
            this.dispatchEvent(selectionEvent);
        }
    }

    /**
     * Prevents blur when clicking on dropdown
     */
    handlePreventBlur() {
        this._cancelBlur = true;
    }

    // GETTERS

    /**
     * Gets the container CSS class
     */
    get getContainerClass() {
        let css = 'slds-combobox_container slds-has-inline-listbox ';
        if (this._hasFocus && this._hasDropdownOpened) {
            css += 'slds-has-input-focus ';
        }
        if (this.errors.length > 0) {
            css += 'has-error';
        }
        return css;
    }

    /**
     * Gets the combobox CSS class
     */
    get getComboboxClass() {
        let css = 'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ';
        if (this._hasDropdownOpened) {
            css += 'slds-is-open';
        }
        return css;
    }

    /**
     * Gets the input CSS class
     */
    get getInputClass() {
        let css = 'slds-input slds-combobox__input ';
        if (this._hasDropdownOpened) {
            css += 'slds-has-focus ';
        }
        if (this._selection.length > 0) {
            css += 'slds-combobox__input-value ';
        }
        return css;
    }

    /**
     * Gets the dropdown CSS class
     */
    get getDropdownClass() {
        return 'slds-dropdown slds-dropdown_length-with-icon-7 slds-dropdown_fluid';
    }

    /**
     * Gets the search icon CSS class
     */
    get getSearchIconClass() {
        let css = 'slds-input__icon slds-input__icon_right ';
        if (!this._selection.length) {
            css += 'slds-hide';
        }
        return css;
    }

    /**
     * Gets the clear button CSS class
     */
    get getClearSelectionButtonClass() {
        return 'slds-button slds-button_icon slds-input__icon slds-input__icon_right';
    }

    /**
     * Gets the clear button icon CSS class
     */
    get getClearSelectionButtonIconClass() {
        return 'slds-button__icon slds-icon-text-light';
    }

    /**
     * Gets the selection pill CSS class
     */
    get getSelectionPillClass() {
        return 'slds-pill slds-pill_link';
    }

    /**
     * Gets the help message to display when the input is focused
     */
    get getInputHelp() {
        if (this._searchTerm.length === 0 && this.displaySearchTermHelpText) {
            return this.searchTermHelpText;
        } else if (this._searchTerm.length < MINIMAL_SEARCH_TERM_LENGTH && this.displayMinimalSearchTermLengthHelpText) {
            return this.minimalSearchTermLengthHelpText;
        }
        return '';
    }

    /**
     * Gets the selected record
     */
    get selection() {
        return this._selection.length > 0 ? this._selection[0] : null;
    }

    /**
     * Gets the errors
     */
    get errors() {
        return this._errors;
    }

    /**
     * Gets whether the lookup has focus
     */
    get hasFocus() {
        return this._hasFocus;
    }

    /**
     * Gets whether the dropdown is open
     */
    get hasDropdownOpened() {
        return this._hasDropdownOpened;
    }

    /**
     * Gets the search term
     */
    get searchTerm() {
        return this._searchTerm;
    }

    /**
     * Gets the search results
     */
    get searchResults() {
        return this._searchResults;
    }

    /**
     * Gets whether the component has a selection
     */
    get hasSelection() {
        return this._selection.length > 0;
    }

    /**
     * Gets whether the component should display the search help text
     */
    get showSearchHelp() {
        return (this._searchTerm.length === 0 && this.displaySearchTermHelpText) ||
            (this._searchTerm.length > 0 && this._searchTerm.length < MINIMAL_SEARCH_TERM_LENGTH && this.displayMinimalSearchTermLengthHelpText);
    }

    get noSearchResults() {
        //{searchResults.length === 0 && !isLoading && !showSearchHelp}
        return this._searchResults.length === 0 && !this.isLoading && !this.showSearchHelp;
    }

}

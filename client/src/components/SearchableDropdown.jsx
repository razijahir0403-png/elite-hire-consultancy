import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const isValueMatch = (optVal, currentVal) => {
  if (currentVal === '' || currentVal === null || currentVal === undefined) {
    return optVal === '' || optVal === null || optVal === undefined;
  }
  if (optVal === '' || optVal === null || optVal === undefined) {
    return false;
  }
  return String(optVal) === String(currentVal);
};

/**
 * SearchableDropdown
 *
 * A reusable, fully-accessible, keyboard-navigable searchable dropdown component.
 * Supports light & dark themes, responsive layout, search filtering, and clear selection.
 */
const SearchableDropdown = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select Workflow Status',
  emptyOptionLabel,
  emptyOptionValue = '',
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  name = 'workflowStatus',
  id,
  ariaLabel = 'Workflow Status',
  autoFocusSearch = true,
  searchPlaceholder = 'Search status...',
}) => {
  const generatedId = useId();
  const dropdownId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsListRef = useRef(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => isValueMatch(opt.value, value));
  }, [options, value]);

  const hasEmptySelection = isValueMatch(emptyOptionValue, value);

  // Determine button display text
  const displayLabel = useMemo(() => {
    if (selectedOption) return selectedOption.label;
    if (hasEmptySelection && emptyOptionLabel) return emptyOptionLabel;
    return placeholder;
  }, [selectedOption, hasEmptySelection, emptyOptionLabel, placeholder]);

  const isPlaceholderActive = !selectedOption && (!hasEmptySelection || !emptyOptionLabel);

  // Filter options based on search query (case-insensitive, partial matching)
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) =>
      String(opt.label || '').toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  // Include emptyOptionLabel in the list if provided and matches query
  const showEmptyOption = useMemo(() => {
    if (!emptyOptionLabel) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return emptyOptionLabel.toLowerCase().includes(q);
  }, [emptyOptionLabel, searchQuery]);

  // Flattened selectable items for keyboard navigation
  const selectableItems = useMemo(() => {
    const list = [];
    if (showEmptyOption) {
      list.push({ value: emptyOptionValue, label: emptyOptionLabel, isEmptyOption: true });
    }
    filteredOptions.forEach((opt) => list.push(opt));
    return list;
  }, [showEmptyOption, emptyOptionLabel, emptyOptionValue, filteredOptions]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      if (autoFocusSearch) {
        // Timeout ensures modal/layout rendering is complete
        const timer = setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen, autoFocusSearch]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsListRef.current) {
      const items = optionsListRef.current.querySelectorAll('[data-dropdown-item]');
      if (items && items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, highlightedIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const emitChange = (newVal) => {
    if (disabled) return;
    if (onChange) {
      // Event-shaped object for drop-in compatibility with (e) => setStatus(e.target.value)
      const eventLike = {
        target: {
          name,
          value: newVal,
        },
        currentTarget: {
          name,
          value: newVal,
        },
        value: newVal,
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(eventLike);
    }
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleSelectOption = (optVal) => {
    emitChange(optVal);
  };

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        selectableItems.length === 0 ? -1 : (prev + 1) % selectableItems.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        selectableItems.length === 0
          ? -1
          : (prev - 1 + selectableItems.length) % selectableItems.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < selectableItems.length) {
        handleSelectOption(selectableItems[highlightedIndex].value);
      } else if (selectableItems.length > 0) {
        // Select first matching option if Enter is hit while typing
        handleSelectOption(selectableItems[0].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-left ${className}`}
      id={dropdownId}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`w-full flex items-center justify-between text-left transition-all ${
          buttonClassName ||
          'px-3 py-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#475569] rounded-xl text-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#00B96B] focus:ring-1 focus:ring-[#00B96B]'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-500'}`}
      >
        <span
          className={`truncate pr-2 ${
            isPlaceholderActive
              ? 'text-slate-400 dark:text-slate-400 font-normal'
              : 'text-slate-800 dark:text-white font-semibold'
          }`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#00B96B]' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#475569] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col ${dropdownClassName}`}
          style={{ minWidth: '100%' }}
        >
          {/* Search Box at Top */}
          <div className="p-2 border-b border-slate-100 dark:border-[#334155] bg-slate-50/70 dark:bg-[#1E293B]">
            <div className="relative flex items-center">
              <Search
                size={13}
                className="absolute left-2.5 text-slate-400 dark:text-slate-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                aria-label="Search status options"
                className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00B96B] focus:ring-1 focus:ring-[#00B96B]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={optionsListRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50 dark:divide-slate-800/60 focus:outline-none"
          >
            {selectableItems.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-slate-400 dark:text-slate-400 italic">
                No matching statuses found
              </div>
            ) : (
              selectableItems.map((opt, idx) => {
                const isSelected = isValueMatch(opt.value, value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.key || `${opt.value}-${opt.label}`}
                    data-dropdown-item
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer select-none transition-colors ${
                      isHighlighted
                        ? 'bg-slate-100 dark:bg-[#334155] text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-200'
                    } ${
                      isSelected
                        ? 'font-bold text-[#008952] dark:text-[#00D98B] bg-emerald-50/60 dark:bg-emerald-950/20'
                        : ''
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && (
                      <Check
                        size={13}
                        className="text-[#008952] dark:text-[#00D98B] shrink-0"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;

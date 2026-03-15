# Preparation category (and similar) showing in English — fix plan

## Overview

Fix preparation category (and similar canonical keys) showing in English instead of Hebrew: ensure all UI and export paths translate category keys via the dictionary, and that the dictionary is populated for any category that can appear.

## Root cause

1. **Display path**: CustomSelect uses translateLabels true; TranslationService returns key when not in dictionary.
2. **Missing translation**: Category keys not in dictionary (dictionary.json preparation_categories or DICTIONARY_CACHE) display as raw key.
3. **Raw display**: Some places render category without translatePipe (e.g. preparation-search).

## Plan

1. **preparation-search.component.html**: Add translatePipe to category group header and category pill.
2. **export.service.ts**: Inject TranslationService; add private heCategory(cat); use it wherever category is written to prep/checklist rows.
3. **dictionary.json**: Add missing preparation_categories keys (e.g. knife_work) with Hebrew label.

## Atomic sub-tasks

- [x] preparation-search.component.html: add translatePipe to category header and category pill.
- [x] export.service.ts: inject TranslationService; heCategory(); use for all prep/checklist category columns.
- [x] dictionary.json: add missing preparation_categories (e.g. knife_work).

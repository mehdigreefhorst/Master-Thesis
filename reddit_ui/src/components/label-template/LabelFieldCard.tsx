import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { LLMLabelField, LLMLabelFieldType } from '@/types/label-template';

interface LabelFieldCardProps {
  label: LLMLabelField;
  index: number;
  onUpdate: (field: keyof LLMLabelField, value: any) => void;
  onRemove: () => void;
  title: string;
}

export function LabelFieldCard({ label, index, onUpdate, onRemove, title }: LabelFieldCardProps) {
  const [possibleValueInput, setPossibleValueInput] = useState('');

  const addPossibleValue = () => {
    if (possibleValueInput.trim()) {
      onUpdate('possible_values', [...label.possible_values, possibleValueInput.trim()]);
      setPossibleValueInput('');
    }
  };

  const removePossibleValue = (valueIndex: number) => {
    onUpdate('possible_values', label.possible_values.filter((_, i) => i !== valueIndex));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPossibleValue();
    }
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors bg-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 font-semibold transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="space-y-4 w-full flex flex-grow justif-between gap-1">
        <div className='flex-2'>
            <Input
            label="Label Name *"
            value={label.label}
            onChange={(e) => onUpdate('label', e.target.value)}
            placeholder="e.g., problem_description"
            />
        </div>
        <div className='flex-5'>
        <Textarea
          label="Explanation *"
          value={label.explanation}
          onChange={(e) => onUpdate('explanation', e.target.value)}
          rows={2}
          placeholder="Explain what this label represents..."
        />
        </div>

        <div className='flex-1'>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type *
          </label>
          <select
            value={label.type}
            onChange={(e) => onUpdate('type', e.target.value as LLMLabelFieldType)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-all"
          >
            <option value="string">String</option>
            <option value="boolean">Boolean</option>
            <option value="category">Category</option>
            <option value="integer">Integer</option>
            <option value="float">Float</option>
          </select>
        </div>

        {label.type === 'category' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Possible Values * (for category type)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={possibleValueInput}
                onChange={(e) => setPossibleValueInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-all"
                placeholder="e.g., positive"
              />
              <button
                type="button"
                onClick={addPossibleValue}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {label.possible_values.map((value, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => removePossibleValue(i)}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {label.type === 'category' && label.possible_values.length === 0 && (
              <p className="mt-2 text-sm text-red-600">Category type requires at least one possible value</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";

interface AttributeImage {
  value: string;
  imageUrl?: string;
}

interface VariantsSelectorProps {
  allOptions: Record<string, Set<string>>;
  availableOptions: Record<string, Set<string>>;
  selectedAttributes: Record<string, string>;
  handleAttributeSelect: (key: string, value: string) => void;
  attributeImages?: Record<string, AttributeImage[]>;
  onImageChange?: (imageUrl: string | null) => void;
}

export default function VariantsSelector({
  allOptions,
  availableOptions,
  selectedAttributes,
  handleAttributeSelect,
  attributeImages = {},
  onImageChange
}: VariantsSelectorProps) {
  return (
    <div className="space-y-4 text-black">
      {Object.entries(allOptions).map(([key, values]) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {key}:
            </label>
            <span className="text-xs text-gray-500">
              {selectedAttributes[key] || "Selecione"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-black">
            {Array.from(values).map(value => {
              const isSelected = selectedAttributes[key] === value;
              const isAvailable = availableOptions[key]?.has(value) ?? false;
              const attrImage = attributeImages[key]?.find(i => i.value === value)?.imageUrl;

              return (
                <button
                  key={value}
                  onClick={() => {
                    handleAttributeSelect(key, value);
                    if (onImageChange) onImageChange(attrImage ?? null);
                  }}
                  disabled={!isAvailable}
                  className={`
                    relative flex items-center justify-center 
                    border rounded-lg text-sm font-medium transition-colors
                    ${isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm"
                      : isAvailable
                        ? "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50"
                        : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                    }
                    ${attrImage ? "p-0 w-12 h-12" : "px-4 py-2"}
                  `}
                >
                  {attrImage ? (
                    <img
                      src={attrImage}
                      alt={value}
                      className={`w-full h-full object-cover rounded-md ${!isAvailable ? "opacity-40" : ""}`}
                    />
                  ) : (
                    <>
                      {value}
                      {!isAvailable && <span className="ml-1 text-xs">Indisp.</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
"use client";

const STEPS = [
  { label: "Upload", icon: "1" },
  { label: "Preview", icon: "2" },
  { label: "Processing", icon: "3" },
  { label: "Results", icon: "4" },
];

/**
 * Visual step indicator showing progress through the import flow.
 * @param {{ currentStep: number }} props
 */
export default function Stepper({ currentStep }) {
  return (
    <div className="stepper fade-in">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={step.label} className="stepper__step">
            {/* Connector line (not before first step) */}
            {index > 0 && (
              <div
                className={`stepper__connector ${
                  isCompleted || isActive ? "stepper__connector--completed" : ""
                }`}
              />
            )}

            {/* Circle */}
            <div
              className={`stepper__circle ${
                isCompleted
                  ? "stepper__circle--completed"
                  : isActive
                  ? "stepper__circle--active"
                  : "stepper__circle--pending"
              }`}
            >
              {isCompleted ? "✓" : step.icon}
            </div>

            {/* Label */}
            <span
              className={`stepper__label ${
                isActive
                  ? "stepper__label--active"
                  : isCompleted
                  ? "stepper__label--completed"
                  : ""
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

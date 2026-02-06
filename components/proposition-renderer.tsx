import type { SerializedProposition } from "@/lib/schemas";

export function PropositionRenderer({
  proposition,
  index,
}: {
  proposition: SerializedProposition;
  index: number;
}) {
  const propType = proposition.prop_type;

  let content: React.ReactNode;

  switch (propType) {
    case "person_and_attribute":
      content = (
        <span>
          <strong>{proposition.person}</strong> was with{" "}
          <em>{proposition.value}</em>
        </span>
      );
      break;

    case "person_or_person":
      content = (
        <span>
          (<strong>{proposition.person1}</strong> with{" "}
          <em>{proposition.val1}</em>) OR (
          <strong>{proposition.person2}</strong> with{" "}
          <em>{proposition.val2}</em>)
        </span>
      );
      break;

    case "person_attribute_implies_not_killer":
      content = (
        <span>
          If <strong>{proposition.person}</strong> was with{" "}
          <em>{proposition.value}</em>, then{" "}
          <strong>{proposition.person}</strong> is not the killer
        </span>
      );
      break;

    case "complex_or":
      content = (
        <span>
          (<strong>{proposition.person1}</strong> with{" "}
          <em>{proposition.mat1}</em>) OR (
          <strong>{proposition.person2}</strong> with{" "}
          <em>{proposition.food2}</em> and <em>{proposition.inst2}</em>)
        </span>
      );
      break;

    case "direct_elimination":
      content = (
        <span>
          <strong>{proposition.person}</strong> was with{" "}
          <em>{proposition.value}</em>{" "}
          <span className="text-green-600 dark:text-green-400">
            (alibi: not the killer)
          </span>
        </span>
      );
      break;

    default: {
      const _exhaustive: never = propType;
      return _exhaustive;
    }
  }

  return (
    <div className="proposition-item py-2 px-3 border-l-2 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <span className="text-zinc-500 dark:text-zinc-400 mr-2">{index}.</span>
      {content}
    </div>
  );
}

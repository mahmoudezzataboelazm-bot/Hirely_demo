import { useEffect, useState, useRef } from "react";
import { getSkillLibrary, saveSkillLibrary } from "../../services/hirelyBridge";
import {
  Card,
  Badge,
  PageHeader,
  PrimaryButton,
  GhostButton,
} from "../components/ui";
import { Modal, Field, SelectField } from "../components/Modal";
import { Plus, Sparkles, Trash2 } from "../components/icons";

export default function SkillLibrary({ toast }) {
  // The global skill taxonomy. Job requirements (Company Admin / Recruiter)
  // and applicant profile skills both read from this list.
  const [categories, setCategories] = useState(() => getSkillLibrary());
  useEffect(() => { saveSkillLibrary(categories); }, [categories]);

  const [suggestions, setSuggestions] = useState([
    "Next.js",
    "Generative AI Prompting",
    "Sustainability Reporting",
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [editName, setEditName] = useState("");
  const [skillOpen, setSkillOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] = useState(0);
  const fileRef = useRef(null);

  const totalSkills = categories.reduce((n, c) => n + c.skills.length, 0);

  const handleBulkImportClick = () => fileRef.current?.click();
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const names = String(reader.result)
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!names.length) return;
      setCategories((cats) =>
        cats.map((c, i) =>
          i === 0 ? { ...c, skills: [...new Set([...c.skills, ...names])] } : c,
        ),
      );
      toast(`Imported ${names.length} skills into "${categories[0].name}"`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCategories((c) => [...c, { name: newCatName, skills: [] }]);
    setAddOpen(false);
    toast(`"${newCatName}" category added`);
    setNewCatName("");
  };

  const openEdit = (i) => {
    setEditIdx(i);
    setEditName(categories[i].name);
  };
  const handleDeleteCategory = (i) => {
    if (categories.length === 1) { toast("Keep at least one category in the library"); return; }
    const name = categories[i].name;
    if (!window.confirm(`Delete category "${name}" and all its skills?`)) return;
    setCategories((cats) => cats.filter((_, idx) => idx !== i));
    toast(`"${name}" category removed`);
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const name = skillName.trim();
    if (!name) return;
    const exists = categories.some((c) => c.skills.some((s) => s.toLowerCase() === name.toLowerCase()));
    if (exists) { toast("This skill already exists"); return; }
    setCategories((cats) => cats.map((c, i) => i === Number(skillCategory) ? { ...c, skills: [...c.skills, name] } : c));
    setSkillName("");
    setSkillOpen(false);
    toast(`"${name}" added to the skill library`);
  };

  const handleDeleteSkill = (categoryIndex, skill) => {
    if (!window.confirm(`Remove "${skill}" from the global skill library?`)) return;
    setCategories((cats) => cats.map((c, i) => i === categoryIndex ? { ...c, skills: c.skills.filter((s) => s !== skill) } : c));
    toast(`"${skill}" removed`);
  };

  const handleEditSave = () => {
    setCategories((cats) =>
      cats.map((c, i) => (i === editIdx ? { ...c, name: editName } : c)),
    );
    toast("Category renamed");
    setEditIdx(null);
  };

  const handleReviewAddAll = () => {
    setCategories((cats) =>
      cats.map((c) => {
        if (c.name === "Technology & Engineering")
          return {
            ...c,
            skills: [...c.skills, "Next.js", "Generative AI Prompting"],
          };
        if (c.name === "Business & Finance")
          return { ...c, skills: [...c.skills, "Sustainability Reporting"] };
        return c;
      }),
    );
    setSuggestions([]);
    toast("3 suggested skills added to the library");
  };

  return (
    <div>
      <PageHeader
        title="Skill library"
        subtitle="Manage the global skill taxonomy used for AI resume parsing and DFS skills matching."
        action={
          <div className="flex gap-2">
            <GhostButton onClick={handleBulkImportClick}>
              Bulk import
            </GhostButton>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFile}
            />
            <GhostButton icon={Plus} onClick={() => { setSkillCategory(0); setSkillOpen(true); }}>
              Add skill
            </GhostButton>
            <PrimaryButton icon={Plus} onClick={() => setAddOpen(true)}>
              Add category
            </PrimaryButton>
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {categories.map((c, i) => (
            <Card key={c.name} className="p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  <Badge tone="indigo">{c.skills.length} skills</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(i)} className="text-sm text-indigo-700 font-medium">Edit category</button>
                  <button onClick={() => handleDeleteCategory(i)} className="text-sm text-rose-600 font-medium">Delete</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.skills.map((s) => (
                  <span
                    key={s}
                    className="bg-slate-100 text-slate-700 text-sm px-3 py-1.5 rounded-lg"
                  >
                    {s}
                    <button type="button" onClick={() => handleDeleteSkill(i, s)} className="ml-1 text-slate-400 hover:text-rose-600" title="Remove skill"><Trash2 size={12} /></button>
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">
              Library overview
            </h3>
            {[
              ["Total skills", totalSkills],
              ["Active categories", categories.length],
              ["Last updated", "just now"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1.5">
                <span className="text-slate-500">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </Card>
          {suggestions.length > 0 && (
            <Card className="p-5 bg-indigo-900 text-indigo-50 border-none">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <Sparkles size={15} />
                AI suggestion
              </div>
              <p className="text-sm text-indigo-200 mb-3">
                Market analysis suggests adding{" "}
                {suggestions.map((s) => `"${s}"`).join(", ")}.
              </p>
              <button
                onClick={handleReviewAddAll}
                className="w-full bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg"
              >
                Review & add all
              </button>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={skillOpen}
        onClose={() => setSkillOpen(false)}
        title="Add skill"
        footer={<PrimaryButton onClick={handleAddSkill}>Add skill</PrimaryButton>}
      >
        <Field label="Skill name" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
        <SelectField
          label="Category"
          options={categories.map((c) => c.name)}
          value={categories[skillCategory]?.name || categories[0]?.name}
          onChange={(e) => setSkillCategory(categories.findIndex((c) => c.name === e.target.value))}
        />
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add category"
        footer={
          <PrimaryButton onClick={handleAddCategory}>
            Add category
          </PrimaryButton>
        }
      >
        <Field
          label="Category name"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
        />
      </Modal>

      <Modal
        open={editIdx !== null}
        onClose={() => setEditIdx(null)}
        title="Edit category"
        footer={<PrimaryButton onClick={handleEditSave}>Save</PrimaryButton>}
      >
        <Field
          label="Category name"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
        />
      </Modal>
    </div>
  );
}

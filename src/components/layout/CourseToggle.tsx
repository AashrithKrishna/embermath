import { SegmentedControl } from "@/components/ui/SegmentedControl"

interface CourseToggleProps {
  courses: string[]
  value: string
  onChange: (course: string) => void
}

export function CourseToggle({ courses, value, onChange }: CourseToggleProps) {
  return (
    <SegmentedControl
      ariaLabel="Question bank course"
      options={courses.map((course) => ({ value: course, label: course }))}
      value={value}
      onChange={onChange}
    />
  )
}
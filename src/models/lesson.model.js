import mongoose, {Schema} from "mongoose";


const LessonSchema = new Schema({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course', // Make sure 'Course' matches the model name you used
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
  },
  videoUrl: {
    type: String,
  },

  thumbnailUrl: {
    type: String,
  },
  isFree: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export const Lesson = mongoose.model("Lesson", LessonSchema)


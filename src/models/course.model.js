import mongoose, {Schema} from "mongoose";


const CourseSchema = new Schema({
  lessons: [{
    type: Schema.Types.ObjectId,
    ref: 'Lesson', // Change 'Lesson' to the actual model name you use
  }],
  instructorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',   // Change 'User' to the actual instructor model name
    required: true
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Schema.Types.Decimal128, // or use Number if you prefer
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required : true
  },
  category: {
    type: String,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true // automatically adds createdAt and updatedAt
});

export const Course = mongoose.model("Course", CourseSchema)

import mongoose from 'mongoose'

import _ from 'mongoose-long'
_(mongoose)

const MemberSchema = new mongoose.Schema({
    _id: {type: mongoose.Schema.Types.Long, required: true},
    lichessId: String,
    prevLichess: [String],
    chesscomId: String,
    prevChesscom: [String],
    serverRating: Number,
    serverRank: Number
}, {
    versionKey: false
})

export default mongoose.model('Member', MemberSchema)